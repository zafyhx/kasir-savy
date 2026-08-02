const sharp = require("sharp");
const path = require("path");

const root = path.join(__dirname, "..");
const CREAM = { r: 0xf7, g: 0xf1, b: 0xe4, alpha: 1 };

async function main() {
  const logogram = path.join(root, "public/brand/logogram.png");
  const logogramOutline = path.join(root, "public/brand/logogram-outline.png");
  const profilIg = path.join(root, "public/brand/profil-ig.png");

  for (const size of [192, 512]) {
    await sharp(profilIg)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(root, `public/icons/icon-${size}.png`));
  }

  for (const size of [192, 512]) {
    const logoSize = Math.round(size * 0.62);
    const logoBuf = await sharp(logogram)
      .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: CREAM },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(path.join(root, `public/icons/icon-maskable-${size}.png`));
  }

  // Favicon & apple touch icon: logogram outline langsung di kanvas transparan,
  // tanpa kartu/grid krem di belakangnya — beda dari ikon PWA di bawah.
  {
    const size = 180;
    const logoSize = size;
    const logoBuf = await sharp(logogramOutline)
      .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(path.join(root, "src/app/apple-icon.png"));
  }

  {
    const size = 256;
    const logoSize = size;
    const logoBuf = await sharp(logogramOutline)
      .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(path.join(root, "src/app/icon.png"));
  }

  console.log("Icons generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
