type OgCardProps = Readonly<{
  title: string;
  label: string;
  description?: string;
}>;

const pixels = [
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 1, 2, 2, 1, 1, 0, 0,
  1, 2, 3, 3, 2, 1, 1, 0,
  1, 2, 3, 3, 2, 2, 1, 0,
  0, 1, 2, 2, 2, 1, 0, 0,
  0, 1, 1, 2, 1, 1, 0, 0,
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 0, 0, 1, 0, 0, 0, 0,
] as const;

const colors = ["#11100f", "#526f74", "#f06a32", "#f5f2e8"] as const;

export function OgCard({ title, label, description }: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#11100f",
        color: "#f5f2e8",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(245,242,232,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,232,.24) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div style={{ position: "absolute", left: 68, top: 56, display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            display: "flex",
            position: "relative",
            border: "4px solid #f5f2e8",
            background: "#f5f2e8",
            boxShadow: "7px 7px 0 #f06a32",
          }}
        >
          <div style={{ position: "absolute", left: 4, top: 4, width: 18, height: 18, background: "#11100f" }} />
          <div style={{ position: "absolute", right: 4, top: 4, width: 18, height: 18, background: "#f06a32" }} />
          <div style={{ position: "absolute", left: 4, bottom: 4, width: 18, height: 18, background: "#f06a32" }} />
          <div style={{ position: "absolute", right: 4, bottom: 4, width: 18, height: 18, background: "#11100f" }} />
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: "0.02em" }}>PIGMENT</div>
        <div style={{ width: 2, height: 28, display: "flex", background: "#f5f2e8" }} />
        <div style={{ display: "flex", color: "#aaa49a", fontFamily: "Geist Mono", fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {label}
        </div>
      </div>

      <div style={{ position: "absolute", left: 72, top: 168, width: 630, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 62, height: 8, marginBottom: 28, background: "#f06a32" }} />
        <div style={{ display: "flex", fontSize: title.length > 34 ? 62 : 72, lineHeight: 0.96, fontWeight: 650, letterSpacing: "-0.055em" }}>
          {title}
        </div>
        {description ? (
          <div style={{ display: "flex", width: 550, marginTop: 28, color: "#aaa49a", fontSize: 23, lineHeight: 1.4 }}>
            {description}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          right: 72,
          top: 116,
          width: 374,
          height: 404,
          display: "flex",
          flexDirection: "column",
          padding: 22,
          border: "4px solid #f5f2e8",
          background: "#181715",
          boxShadow: "12px 12px 0 #050505",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, color: "#aaa49a", fontFamily: "Geist Mono", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <span>Source / 8×8</span>
          <span style={{ color: "#f06a32" }}>RGBA → ID</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 322, height: 322, border: "1px solid #5e5a53" }}>
          {pixels.map((color, index) => (
            <div
              key={index}
              style={{
                width: 40,
                height: 40,
                display: "flex",
                background: colors[color],
                borderRight: "1px solid #5e5a53",
                borderBottom: "1px solid #5e5a53",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", left: 72, bottom: 44, display: "flex", color: "#aaa49a", fontFamily: "Geist Mono", fontSize: 14, letterSpacing: "0.13em", textTransform: "uppercase" }}>
        Pixels · palettes · algorithms
      </div>
      <div style={{ position: "absolute", right: 72, bottom: 38, display: "flex", padding: "12px 18px", border: "3px solid #f5f2e8", background: "#f06a32", color: "#17100c", fontFamily: "Geist Mono", fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "5px 5px 0 #050505" }}>
        pigment.phil.bingo
      </div>
    </div>
  );
}
