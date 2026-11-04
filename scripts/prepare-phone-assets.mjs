import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import JSZip from "jszip";

const root = process.cwd();
const assets = join(root, "public", "assets");
const required = [
  "audio/day-by-day.m4a",
  "avatars/weibo-avatar.jpg",
  "avatars/wechat-avatar.jpg",
  "douban/group-reference.jpg",
  "moments/moments-cover.jpg",
  "moments/moments-post-camera.jpg",
  "video/photos-clip.mov",
  "su.jpg",
  ...Array.from({ length: 11 }, (_, i) => `gallery/${String(i + 1).padStart(2, "0")}.jpg`),
];
const missing = () => required.filter((p) => !existsSync(join(assets, p)) || statSync(join(assets, p)).size === 0);
if (missing().length === 0) {
  console.log("Phone assets already prepared; skipping archive extraction.");
  process.exit(0);
}

const archive = join(root, "FoundPhone-assets-upload.zip");
if (!existsSync(archive)) {
  console.error("Phone media archive is missing: FoundPhone-assets-upload.zip");
  process.exit(1);
}
const zip = await JSZip.loadAsync(readFileSync(archive));
const names = Object.keys(zip.files);
const prefix = names.some((n) => n.startsWith("FoundPhone-assets-upload/assets/"))
  ? "FoundPhone-assets-upload/assets/"
  : names.some((n) => n.startsWith("assets/"))
    ? "assets/"
    : null;
if (!prefix) throw new Error("Could not locate assets/ directory inside the uploaded archive.");

mkdirSync(assets, { recursive: true });
// Keep the separately uploaded, latest lock-screen wallpaper.
const wallpaper = join(assets, "su.jpg");
const wallpaperBackup = existsSync(wallpaper) ? readFileSync(wallpaper) : null;
rmSync(join(assets, "gallery"), { recursive: true, force: true });
for (const name of names) {
  const entry = zip.files[name];
  if (entry.dir || !name.startsWith(prefix)) continue;
  const rel = name.slice(prefix.length);
  if (!rel || rel === "su.jpg" || rel.startsWith("../")) continue;
  const target = resolve(assets, rel);
  if (!target.startsWith(resolve(assets) + "/")) continue;
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, await entry.async("nodebuffer"));
}
if (wallpaperBackup) writeFileSync(wallpaper, wallpaperBackup);

const moments = join(assets, "moments");
mkdirSync(moments, { recursive: true });
const coverSource = join(assets, "微信朋友圈封面.jpg");
const postSource = join(assets, "朋友圈配图拍你一辈子.jpg");
if (existsSync(coverSource)) copyFileSync(coverSource, join(moments, "moments-cover.jpg"));
if (existsSync(postSource)) copyFileSync(postSource, join(moments, "moments-post-camera.jpg"));

const avatars = join(assets, "avatars");
const douban = join(assets, "douban");
mkdirSync(avatars, { recursive: true });
mkdirSync(douban, { recursive: true });
if (existsSync(join(avatars, "111.png"))) copyFileSync(join(avatars, "111.png"), join(avatars, "weibo-avatar.jpg"));
if (existsSync(join(avatars, "222.jpg"))) copyFileSync(join(avatars, "222.jpg"), join(avatars, "wechat-avatar.jpg"));
if (existsSync(join(douban, "2.jpg"))) copyFileSync(join(douban, "2.jpg"), join(douban, "group-reference.jpg"));

const audioDir = join(assets, "audio");
if (existsSync(audioDir)) {
  const audio = readdirSync(audioDir).find((n) => /\.(m4a|mp3|wav)$/i.test(n));
  if (audio && audio !== "day-by-day.m4a") copyFileSync(join(audioDir, audio), join(audioDir, "day-by-day.m4a"));
}
const gallery = join(assets, "gallery");
if (existsSync(gallery)) {
  const photos = readdirSync(gallery).filter((n) => /\.(jpg|jpeg|png|webp)$/i.test(n)).sort();
  photos.forEach((name, i) => {
    const target = join(gallery, `${String(i + 1).padStart(2, "0")}.jpg`);
    if (join(gallery, name) !== target) copyFileSync(join(gallery, name), target);
  });
}
const videoDir = join(assets, "video");
if (existsSync(videoDir)) {
  const video = readdirSync(videoDir).find((n) => /\.(mov|mp4|webm)$/i.test(n));
  if (video && video !== "photos-clip.mov") copyFileSync(join(videoDir, video), join(videoDir, "photos-clip.mov"));
}
const stillMissing = missing();
if (stillMissing.length) throw new Error("Missing required phone assets after extraction: " + stillMissing.join(", "));
console.log("All phone images, avatars, video, audio and wallpaper are ready for the production build.");
