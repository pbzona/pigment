package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf16"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const maxPaletteColors = 64
const maxPageSize = 24

var (
	tagPattern     = regexp.MustCompile(`^[a-z0-9]+(?:[ _-][a-z0-9]+)*$`)
	hexPattern     = regexp.MustCompile(`^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$`)
	integerPattern = regexp.MustCompile(`^\d+$`)
	numberPattern  = regexp.MustCompile(`^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$`)
	controlChars   = regexp.MustCompile(`[\x00-\x1f\x7f]`)
	databaseOnce   sync.Once
	database       *sql.DB
	databaseErr    error
)

type paletteFilters struct {
	query          string
	tags           []string
	minColors      *int
	maxColors      *int
	hue            *float64
	hueTolerance   float64
	color          *rgbColor
	colorTolerance float64
	sort           string
	page           int
	pageSize       int
}

type rgbColor struct {
	red   int
	green int
	blue  int
	alpha int
}

type paletteResponse struct {
	Data       []palette  `json:"data"`
	Pagination pagination `json:"pagination"`
}

type pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

type palette struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Colors      []string     `json:"colors"`
	ColorCount  int          `json:"colorCount"`
	Tags        []string     `json:"tags"`
	Popularity  int64        `json:"popularity"`
	Author      *author      `json:"author"`
	Attribution *attribution `json:"attribution"`
	CreatedAt   string       `json:"createdAt"`
	UpdatedAt   string       `json:"updatedAt"`
}

type author struct {
	Name string  `json:"name"`
	URL  *string `json:"url"`
}

type attribution struct {
	Text    *string `json:"text"`
	URL     *string `json:"url"`
	License *string `json:"license"`
}

type paletteRow struct {
	id                 int64
	publicID           string
	displayName        string
	colorCount         int
	tagsJSON           string
	authorName         sql.NullString
	authorURL          sql.NullString
	attributionText    sql.NullString
	attributionURL     sql.NullString
	attributionLicense sql.NullString
	popularity         int64
	createdAt          time.Time
	updatedAt          time.Time
}

func GET(w http.ResponseWriter, r *http.Request) {
	filters, message, ok := parsePaletteFilters(r.URL.Query())
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": message}, nil)
		return
	}

	ctx := r.Context()
	db, err := getDatabase()
	if err == nil {
		var result paletteResponse
		result, err = queryPaletteCatalog(ctx, db, filters)
		if err == nil {
			writeJSON(w, http.StatusOK, result, map[string]string{
				"Cache-Control": "private, max-age=60, must-revalidate",
			})
			return
		}
	}

	log.Printf("Palette browser request failed: %v", err)
	writeJSON(w, http.StatusServiceUnavailable, map[string]string{
		"error": "Palette catalog is unavailable.",
	}, nil)
}

func writeJSON(w http.ResponseWriter, status int, value any, headers map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	for key, headerValue := range headers {
		w.Header().Set(key, headerValue)
	}
	w.WriteHeader(status)
	if status != http.StatusNoContent {
		if err := json.NewEncoder(w).Encode(value); err != nil {
			log.Printf("Palette browser response encoding failed: %v", err)
		}
	}
}

func parsePaletteFilters(values url.Values) (paletteFilters, string, bool) {
	allowed := map[string]bool{
		"q": true, "tag": true, "minColors": true, "maxColors": true,
		"hue": true, "hueTolerance": true, "color": true, "colorTolerance": true,
		"sort": true, "page": true, "pageSize": true,
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		if !allowed[key] {
			return paletteFilters{}, "Unknown parameter: " + key + ".", false
		}
		if key != "tag" && len(values[key]) > 1 {
			return paletteFilters{}, key + " may only be supplied once.", false
		}
	}

	get := func(key string) string {
		if items := values[key]; len(items) > 0 {
			return items[0]
		}
		return ""
	}
	present := func(key string) bool { return len(values[key]) > 0 }

	filters := paletteFilters{page: 1, pageSize: maxPageSize, hueTolerance: 15, colorTolerance: 3}
	filters.query = strings.TrimSpace(get("q"))
	if utf16Length(filters.query) > 100 {
		return paletteFilters{}, "q must be at most 100 characters.", false
	}
	if controlChars.MatchString(filters.query) {
		return paletteFilters{}, "Invalid palette query.", false
	}

	tags := make([]string, 0, len(values["tag"]))
	for _, rawTag := range values["tag"] {
		tag := strings.ToLower(strings.TrimSpace(rawTag))
		if tag == "" {
			continue
		}
		tags = append(tags, tag)
	}
	if len(tags) > 10 {
		return paletteFilters{}, "At most 10 tags may be supplied.", false
	}
	seenTags := make(map[string]bool, len(tags))
	for _, tag := range tags {
		if seenTags[tag] {
			return paletteFilters{}, "Tags must be unique.", false
		}
		seenTags[tag] = true
		if len(tag) > 40 || !tagPattern.MatchString(tag) {
			return paletteFilters{}, "A tag is invalid.", false
		}
	}
	filters.tags = tags

	if present("minColors") {
		value, numberErr := parseInteger(get("minColors"), "minColors", 1, maxPaletteColors)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.minColors = &value
	}
	if present("maxColors") {
		value, numberErr := parseInteger(get("maxColors"), "maxColors", 1, maxPaletteColors)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.maxColors = &value
	}
	if filters.minColors != nil && filters.maxColors != nil && *filters.minColors > *filters.maxColors {
		return paletteFilters{}, "minColors cannot exceed maxColors.", false
	}

	if present("hue") {
		value, numberErr := parseNumber(get("hue"), "hue", 0, 360, true)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.hue = &value
	}
	if present("hueTolerance") {
		value, numberErr := parseNumber(get("hueTolerance"), "hueTolerance", 0, 180, false)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.hueTolerance = value
		if filters.hue == nil {
			return paletteFilters{}, "hueTolerance requires hue.", false
		}
	}

	rawColor := strings.TrimSpace(get("color"))
	if rawColor != "" {
		color, valid := parseHexColor(rawColor)
		if !valid {
			return paletteFilters{}, "color must be an RGB or RGBA hex value.", false
		}
		filters.color = &color
	}
	if present("colorTolerance") {
		value, numberErr := parseNumber(get("colorTolerance"), "colorTolerance", 0, 25, false)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.colorTolerance = value
		if filters.color == nil {
			return paletteFilters{}, "colorTolerance requires color.", false
		}
	}

	if present("sort") {
		filters.sort = get("sort")
	} else if filters.query != "" {
		filters.sort = "relevance"
	} else {
		filters.sort = "popularity"
	}
	switch filters.sort {
	case "relevance", "popularity", "recency", "name":
	default:
		return paletteFilters{}, "sort is invalid.", false
	}
	if filters.sort == "relevance" && filters.query == "" {
		return paletteFilters{}, "relevance sorting requires a search query.", false
	}

	if present("page") {
		value, numberErr := parseInteger(get("page"), "page", 1, 100000)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.page = value
	}
	if present("pageSize") {
		value, numberErr := parseInteger(get("pageSize"), "pageSize", 1, maxPageSize)
		if numberErr != "" {
			return paletteFilters{}, numberErr, false
		}
		filters.pageSize = value
	}

	return filters, "", true
}

func parseInteger(raw string, field string, minimum int, maximum int) (int, string) {
	if !integerPattern.MatchString(raw) {
		return 0, field + " must be an integer."
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < minimum || value > maximum {
		return 0, fmt.Sprintf("%s must be between %d and %d.", field, minimum, maximum)
	}
	return value, ""
}

func parseNumber(raw string, field string, minimum float64, maximum float64, exclusiveMaximum bool) (float64, string) {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return 0, field + " must be a number."
	}
	if !numberPattern.MatchString(normalized) {
		return 0, field + " must be a number."
	}
	value, err := strconv.ParseFloat(normalized, 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, field + " must be a number."
	}
	if value < minimum || (exclusiveMaximum && value >= maximum) || (!exclusiveMaximum && value > maximum) {
		suffix := ""
		if exclusiveMaximum {
			suffix = " (exclusive)"
		}
		return 0, fmt.Sprintf("%s must be between %s and %s%s.", field, formatNumber(minimum), formatNumber(maximum), suffix)
	}
	return value, ""
}

func formatNumber(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func utf16Length(value string) int {
	return len(utf16.Encode([]rune(value)))
}

func parseHexColor(value string) (rgbColor, bool) {
	if !hexPattern.MatchString(value) {
		return rgbColor{}, false
	}
	compact := strings.TrimPrefix(strings.ToLower(value), "#")
	if len(compact) == 3 || len(compact) == 4 {
		var expanded strings.Builder
		for _, char := range compact {
			expanded.WriteByte(byte(char))
			expanded.WriteByte(byte(char))
		}
		compact = expanded.String()
	}
	parse := func(part string) int {
		value, _ := strconv.ParseInt(part, 16, 32)
		return int(value)
	}
	color := rgbColor{red: parse(compact[0:2]), green: parse(compact[2:4]), blue: parse(compact[4:6]), alpha: 255}
	if len(compact) == 8 {
		color.alpha = parse(compact[6:8])
	}
	return color, true
}

func getDatabase() (*sql.DB, error) {
	databaseOnce.Do(func() {
		connectionString := strings.TrimSpace(os.Getenv("DATABASE_URL"))
		if connectionString == "" {
			databaseErr = fmt.Errorf("DATABASE_URL must contain a PostgreSQL connection string")
			return
		}
		database, databaseErr = sql.Open("pgx", connectionString)
		if databaseErr != nil {
			return
		}
		database.SetMaxOpenConns(10)
		database.SetMaxIdleConns(2)
		database.SetConnMaxLifetime(30 * time.Minute)
	})
	return database, databaseErr
}

func queryPaletteCatalog(ctx context.Context, db *sql.DB, filters paletteFilters) (paletteResponse, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return paletteResponse{}, err
	}
	defer tx.Rollback()

	where, args, relevance := buildPaletteWhere(filters)
	var total int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*)::INTEGER FROM palettes p `+where, args...).Scan(&total); err != nil {
		return paletteResponse{}, err
	}

	orderBy := map[string]string{
		"relevance":  relevance + ` ASC, p.popularity DESC, LOWER(p.display_name) ASC, p.public_id ASC`,
		"popularity": `p.popularity DESC, p.updated_at DESC, LOWER(p.display_name) ASC, p.public_id ASC`,
		"recency":    `p.updated_at DESC, LOWER(p.display_name) ASC, p.public_id ASC`,
		"name":       `LOWER(p.display_name) ASC, p.public_id ASC`,
	}[filters.sort]
	limitPlaceholder := len(args) + 1
	offsetPlaceholder := len(args) + 2
	query := fmt.Sprintf(`SELECT
		p.id, p.public_id, p.display_name, p.color_count, COALESCE(array_to_json(p.tags)::TEXT, '[]'),
		p.author_name, p.author_url, p.attribution_text, p.attribution_url, p.attribution_license,
		p.popularity, p.created_at, p.updated_at
		FROM palettes p %s ORDER BY %s LIMIT $%d OFFSET $%d`, where, orderBy, limitPlaceholder, offsetPlaceholder)
	queryArgs := append(append([]any{}, args...), filters.pageSize, (filters.page-1)*filters.pageSize)
	rows, err := tx.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return paletteResponse{}, err
	}
	items := make([]paletteRow, 0, filters.pageSize)
	for rows.Next() {
		var row paletteRow
		if err := rows.Scan(
			&row.id, &row.publicID, &row.displayName, &row.colorCount, &row.tagsJSON,
			&row.authorName, &row.authorURL, &row.attributionText, &row.attributionURL,
			&row.attributionLicense, &row.popularity, &row.createdAt, &row.updatedAt,
		); err != nil {
			rows.Close()
			return paletteResponse{}, err
		}
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return paletteResponse{}, err
	}
	rows.Close()

	colors, err := queryPaletteColors(ctx, tx, items)
	if err != nil {
		return paletteResponse{}, err
	}

	data := make([]palette, 0, len(items))
	for _, row := range items {
		paletteColors := colors[row.id]
		if paletteColors == nil {
			paletteColors = []string{}
		}
		var tags []string
		if err := json.Unmarshal([]byte(row.tagsJSON), &tags); err != nil {
			return paletteResponse{}, err
		}
		if tags == nil {
			tags = []string{}
		}
		mapped := palette{
			ID: row.publicID, Name: row.displayName, Colors: paletteColors,
			ColorCount: len(paletteColors), Tags: tags, Popularity: row.popularity,
			CreatedAt: row.createdAt.UTC().Format("2006-01-02T15:04:05.000Z"),
			UpdatedAt: row.updatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		}
		if row.authorName.Valid {
			mapped.Author = &author{Name: row.authorName.String, URL: nullStringPointer(row.authorURL)}
		}
		if row.attributionText.Valid || row.attributionURL.Valid || row.attributionLicense.Valid {
			mapped.Attribution = &attribution{
				Text: nullStringPointer(row.attributionText), URL: nullStringPointer(row.attributionURL),
				License: nullStringPointer(row.attributionLicense),
			}
		}
		data = append(data, mapped)
	}

	if err := tx.Commit(); err != nil {
		return paletteResponse{}, err
	}
	pages := 0
	if total > 0 {
		pages = (total + filters.pageSize - 1) / filters.pageSize
	}
	return paletteResponse{
		Data:       data,
		Pagination: pagination{Page: filters.page, PageSize: filters.pageSize, TotalItems: total, TotalPages: pages},
	}, nil
}

func nullStringPointer(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	copy := value.String
	return &copy
}

func buildPaletteWhere(filters paletteFilters) (string, []any, string) {
	where := []string{"p.format_version = 2"}
	args := make([]any, 0, 12)
	bind := func(value any) string {
		args = append(args, value)
		return "$" + strconv.Itoa(len(args))
	}
	relevance := "0"
	if filters.query != "" {
		exact := bind(filters.query)
		escaped := bind(escapeLike(filters.query))
		where = append(where, `(
			LOWER(p.display_name) = LOWER(`+exact+`::TEXT) OR
			p.display_name ILIKE ('%' || `+escaped+`::TEXT || '%') ESCAPE '\' OR
			LOWER(`+exact+`::TEXT) = ANY(p.tags) OR
			EXISTS (SELECT 1 FROM UNNEST(p.tags) AS search_tag WHERE search_tag ILIKE ('%' || `+escaped+`::TEXT || '%') ESCAPE '\')
		)`)
		relevance = `CASE
			WHEN LOWER(p.display_name) = LOWER(` + exact + `::TEXT) THEN 0
			WHEN p.display_name ILIKE (` + escaped + `::TEXT || '%') ESCAPE '\' THEN 1
			WHEN p.display_name ILIKE ('%' || ` + escaped + `::TEXT || '%') ESCAPE '\' THEN 2
			WHEN LOWER(` + exact + `::TEXT) = ANY(p.tags) THEN 3
			ELSE 4
		END`
	}
	for _, tag := range filters.tags {
		where = append(where, "p.tags @> ARRAY["+bind(tag)+"]::TEXT[]")
	}
	if filters.minColors != nil {
		where = append(where, "p.color_count >= "+bind(*filters.minColors))
	}
	if filters.maxColors != nil {
		where = append(where, "p.color_count <= "+bind(*filters.maxColors))
	}
	if filters.hue != nil {
		hue := bind(*filters.hue)
		tolerance := bind(filters.hueTolerance)
		where = append(where, `EXISTS (
			SELECT 1 FROM palette_colors hue_color WHERE hue_color.palette_id = p.id
			AND hue_color.hue IS NOT NULL AND LEAST(ABS(hue_color.hue - `+hue+`), 360 - ABS(hue_color.hue - `+hue+`)) <= `+tolerance+`
		)`)
	}
	if filters.color != nil {
		l, a, b := colorOklab(*filters.color)
		targetL := bind(l)
		targetA := bind(a)
		targetB := bind(b)
		targetAlpha := bind(filters.color.alpha)
		maxDistanceSquared := bind(math.Pow(filters.colorTolerance/100, 2))
		where = append(where, `EXISTS (
			SELECT 1 FROM palette_colors match_color WHERE match_color.palette_id = p.id
			AND match_color.alpha = `+targetAlpha+`
			AND ((match_color.ok_l - `+targetL+`) * (match_color.ok_l - `+targetL+`) +
			     (match_color.ok_a - `+targetA+`) * (match_color.ok_a - `+targetA+`) +
			     (match_color.ok_b - `+targetB+`) * (match_color.ok_b - `+targetB+`)) <= `+maxDistanceSquared+`
		)`)
	}
	return "WHERE " + strings.Join(where, " AND "), args, relevance
}

func escapeLike(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, `%`, `\%`)
	return strings.ReplaceAll(value, `_`, `\_`)
}

func queryPaletteColors(ctx context.Context, tx *sql.Tx, rows []paletteRow) (map[int64][]string, error) {
	result := make(map[int64][]string, len(rows))
	if len(rows) == 0 {
		return result, nil
	}
	placeholders := make([]string, len(rows))
	args := make([]any, len(rows))
	for index, row := range rows {
		placeholders[index] = "$" + strconv.Itoa(index+1)
		args[index] = row.id
	}
	query := `SELECT palette_id, LOWER(hex) FROM palette_colors WHERE palette_id IN (` + strings.Join(placeholders, ",") + `) ORDER BY palette_id, position`
	colors, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer colors.Close()
	for colors.Next() {
		var paletteID int64
		var hex string
		if err := colors.Scan(&paletteID, &hex); err != nil {
			return nil, err
		}
		result[paletteID] = append(result[paletteID], hex)
	}
	if err := colors.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func colorOklab(color rgbColor) (float64, float64, float64) {
	linear := func(channel int) float64 {
		value := float64(channel) / 255
		if value <= 0.04045 {
			return value / 12.92
		}
		return math.Pow((value+0.055)/1.055, 2.4)
	}
	r, g, b := linear(color.red), linear(color.green), linear(color.blue)
	l := math.Cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b)
	m := math.Cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b)
	s := math.Cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b)
	return 0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
		1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
		0.0259040371*l + 0.7827717662*m - 0.8086757660*s
}
