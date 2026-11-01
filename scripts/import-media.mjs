#!/usr/bin/env node
// 把作者提供的编号图片导入 stories/template/story.json。
// 用法: node scripts/import-media.mjs <图片文件夹>
// 约定: 1 = 桌面壁纸, 2 = 豆瓣小组头像, 3-13 = 相册照片
// 仅支持 png/jpeg/webp/gif，图片会被内嵌为 data URL，不引用远程资源。
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error("请传入图片文件夹路径，例如: node scripts/import-media.mjs ./images");
  process.exit(1);
}
const target = "stories/template/story.json";
const story = JSON.parse(readFileSync(target, "utf8"));
const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const files = readdirSync(dir);
const findImage = (n) =>
  files.find((f) => {
    const base = f.replace(extname(f), "");
    return base === String(n) && mime[extname(f).toLowerCase()];
  });
const dataUrl = (file) => `data:${mime[extname(file).toLowerCase()]};base64,${readFileSync(join(dir, file)).toString("base64")}`;

const report = [];
const wallpaper = findImage(1);
if (wallpaper) {
  story.phone.wallpaper = dataUrl(wallpaper);
  report.push(`壁纸 ← ${wallpaper}`);
} else report.push("缺少图片 1（壁纸），保持原壁纸");

const avatar = findImage(2);
if (avatar) {
  const post = story.content.forum?.find((i) => i.folder === "淋雨大吉");
  if (post) {
    post.avatar = dataUrl(avatar);
    report.push(`豆瓣小组头像 ← ${avatar}`);
  }
} else report.push("缺少图片 2（豆瓣小组头像）");

for (const id of Object.keys(story.content)) {
  for (const item of story.content[id]) {
    const n = Number(item.id.replace(/^photo-/, ""));
    if (!item.id.startsWith("photo-") || Number.isNaN(n)) continue;
    const file = findImage(n);
    if (file) {
      item.media = dataUrl(file);
      item.title = `照片 ${n}`;
      item.body = "";
      report.push(`照片 ${n} ← ${file}`);
    }
  }
}
story.revision = Number(story.revision || 1) + 1;
writeFileSync(target, JSON.stringify(story, null, 2) + "\n");
console.log(report.join("\n"));
console.log(`已写入 ${target}，revision → ${story.revision}`);
