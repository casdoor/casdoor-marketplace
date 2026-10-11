import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

const publicDir = path.join(process.cwd(), "public");

const mimeTypes: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

async function dataUrl(relativePath: string): Promise<string> {
  const data = await fs.readFile(path.join(publicDir, relativePath));
  return `data:${mimeTypes[path.extname(relativePath).toLowerCase()]};base64,${data.toString("base64")}`;
}

type ShareImageProps = {
  label: string;
  title: string;
  text: string;
  // a path under public/
  logo?: string;
};

// The 1200x630 share image of a page: a label, a title and a line of text on the colors of the hero.
export async function shareImage({ label, title, text, logo }: ShareImageProps) {
  const [brand, logoSrc] = await Promise.all([dataUrl("casdoor-logo_1185x256_dark.png"), logo ? dataUrl(logo) : undefined]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          backgroundColor: "#110d24",
          backgroundImage:
            "radial-gradient(900px 500px at 50% -10%, rgba(124, 58, 237, 0.55), transparent 70%), radial-gradient(700px 360px at 95% 110%, rgba(56, 132, 255, 0.3), transparent 70%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand} alt="" width={222} height={48} />
          <div style={{ display: "flex", fontSize: 30, color: "rgba(255, 255, 255, 0.7)" }}>Marketplace</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {logoSrc && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 200,
                height: 200,
                flexShrink: 0,
                borderRadius: 40,
                backgroundColor: "white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="" width={128} height={128} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#c4b5fd" }}>{label}</div>
            <div style={{ display: "flex", fontSize: title.length > 28 ? 64 : 80, lineHeight: 1.1, letterSpacing: -2 }}>{title}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, lineHeight: 1.4, color: "rgba(255, 255, 255, 0.7)" }}>{text}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
