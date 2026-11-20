package main

import (
	"math"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestParsePaletteFiltersDefaults(t *testing.T) {
	filters, message, ok := parsePaletteFilters(url.Values{})
	if !ok {
		t.Fatalf("parsePaletteFilters failed: %s", message)
	}
	if filters.page != 1 || filters.pageSize != 24 || filters.sort != "popularity" {
		t.Fatalf("unexpected defaults: %#v", filters)
	}
	if filters.hueTolerance != 15 || filters.colorTolerance != 3 {
		t.Fatalf("unexpected tolerance defaults: %#v", filters)
	}
}

func TestParsePaletteFiltersValues(t *testing.T) {
	values := url.Values{
		"q":              {"  sunset  "},
		"tag":            {"warm", "retro"},
		"minColors":      {"3"},
		"maxColors":      {"8"},
		"hue":            {"359"},
		"hueTolerance":   {"12.5"},
		"color":          {"#f08"},
		"colorTolerance": {"2.25"},
		"page":           {"2"},
		"pageSize":       {"20"},
	}
	filters, message, ok := parsePaletteFilters(values)
	if !ok {
		t.Fatalf("parsePaletteFilters failed: %s", message)
	}
	if filters.query != "sunset" || filters.sort != "relevance" || filters.page != 2 || filters.pageSize != 20 {
		t.Fatalf("unexpected parsed fields: %#v", filters)
	}
	if len(filters.tags) != 2 || filters.tags[0] != "warm" || filters.tags[1] != "retro" {
		t.Fatalf("unexpected tags: %#v", filters.tags)
	}
	if filters.color == nil || *filters.minColors != 3 || *filters.maxColors != 8 {
		t.Fatalf("missing parsed filters: %#v", filters)
	}
	if filters.color.red != 255 || filters.color.green != 0 || filters.color.blue != 136 || filters.color.alpha != 255 {
		t.Fatalf("unexpected expanded color: %#v", filters.color)
	}
}

func TestParsePaletteFiltersRejectsInvalidQueries(t *testing.T) {
	tests := []struct {
		name    string
		values  url.Values
		message string
	}{
		{"unknown", url.Values{"unknown": {"1"}}, "Unknown parameter: unknown."},
		{"duplicate", url.Values{"page": {"1", "2"}}, "page may only be supplied once."},
		{"page-size-limit", url.Values{"pageSize": {"25"}}, "pageSize must be between 1 and 24."},
		{"empty-page-size", url.Values{"pageSize": {""}}, "pageSize must be an integer."},
		{"relevance-needs-query", url.Values{"sort": {"relevance"}}, "relevance sorting requires a search query."},
		{"hue-tolerance-needs-hue", url.Values{"hueTolerance": {"2"}}, "hueTolerance requires hue."},
		{"color-tolerance-needs-color", url.Values{"colorTolerance": {"2"}}, "colorTolerance requires color."},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, message, ok := parsePaletteFilters(test.values)
			if ok || message != test.message {
				t.Fatalf("got ok=%v message=%q, want false and %q", ok, message, test.message)
			}
		})
	}
}

func TestPaletteHandlerRejectsBeforeDatabaseAccess(t *testing.T) {
	request := httptest.NewRequest("GET", "/api/palettes?pageSize=25", nil)
	response := httptest.NewRecorder()
	GET(response, request)
	if response.Code != 400 {
		t.Fatalf("status = %d, want 400", response.Code)
	}
	if !strings.Contains(response.Body.String(), "pageSize must be between 1 and 24") {
		t.Fatalf("unexpected response body: %s", response.Body.String())
	}
}

func TestColorOklabRed(t *testing.T) {
	red := rgbColor{red: 255, green: 0, blue: 0, alpha: 255}
	l, a, b := colorOklab(red)
	if math.Abs(l-0.6279553606) > 0.000001 || math.Abs(a-0.2248630611) > 0.000001 || math.Abs(b-0.1258462985) > 0.000001 {
		t.Fatalf("unexpected Oklab values: %f %f %f", l, a, b)
	}
}
