import { existsSync, readFileSync, writeFileSync } from "node:fs";

const indexPath = "dist/index.html";

if (!existsSync(indexPath)) {
  throw new Error("dist/index.html not found. Run npm run build:web first.");
}

const html = readFileSync(indexPath, "utf8")
  .replaceAll('src="/_expo/', 'src="./_expo/')
  .replaceAll('href="/_expo/', 'href="./_expo/');

writeFileSync(indexPath, html);
writeFileSync("dist/.nojekyll", "");

