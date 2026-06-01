import fs from "fs";
import path from "path";

const sourceRoot = process.cwd();
const targetRoot = path.resolve(sourceRoot, "..", "shanfeng-express-douyin-miniapp");
const douyinAppId = process.env.DOUYIN_APP_ID || "tt_placeholder_appid";
const apiBaseUrl = process.env.DOUYIN_API_BASE_URL || "";
const privacyUrl = process.env.DOUYIN_PRIVACY_URL || "https://your-domain.com/privacy";
const agreementUrl = process.env.DOUYIN_AGREEMENT_URL || "https://your-domain.com/agreement";

const copiedEntries = [
  "assets",
  "pages",
  "utils",
  "app.js",
  "app.json",
  "app.wxss",
  "sitemap.json",
  "project.config.json",
  "project.private.config.json"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function convertPath(relativePath) {
  if (relativePath.endsWith(".wxml")) return relativePath.replace(/\.wxml$/, ".ttml");
  if (relativePath.endsWith(".wxss")) return relativePath.replace(/\.wxss$/, ".ttss");
  return relativePath;
}

function convertText(relativePath, text) {
  let nextText = text;

  if (relativePath.endsWith(".wxml")) {
    nextText = nextText
      .replace(/wx:/g, "tt:")
      .replace(/微信和默认/g, "联系方式和默认")
      .replace(/>微信</g, ">抖音号<")
      .replace(/请输入微信号/g, "请输入抖音号或常用联系方式")
      .replace(/微信登录/g, "抖音登录")
      .replace(/\/assets\/ui\/wechat\.png/g, "/assets/ui/user.png");
  }

  if (relativePath.endsWith(".js")) {
    nextText = nextText
      .replace(/\bwx\./g, "tt.")
      .replace(/WX_LOGIN_ERROR/g, "PLATFORM_LOGIN_ERROR");
  }

  if (relativePath === "utils/config.js") {
    const nextMode = apiBaseUrl ? "production" : "mock";
    nextText = nextText
      .replace(/mode: "mock", \/\/ mock \| production/, `mode: "${nextMode}", // mock | production`)
      .replace(/apiBaseUrl: "https:\/\/api\.your-domain\.com"/, `apiBaseUrl: "${apiBaseUrl || "https://api.your-domain.com"}"`)
      .replace(/privacyUrl: "https:\/\/your-domain\.com\/privacy"/, `privacyUrl: "${privacyUrl}"`)
      .replace(/userAgreementUrl: "https:\/\/your-domain\.com\/agreement"/, `userAgreementUrl: "${agreementUrl}"`)
      .replace(/login: "\/api\/v1\/auth\/wechat-login"/, `login: "/api/v1/auth/douyin-login"`);
  }

  return nextText;
}

function copyFile(sourceFile, targetFile, relativePath) {
  ensureDir(path.dirname(targetFile));
  const textExtensions = new Set([".js", ".json", ".wxml", ".wxss", ".md", ".txt"]);
  const ext = path.extname(sourceFile);

  if (textExtensions.has(ext)) {
    fs.writeFileSync(targetFile, convertText(relativePath, fs.readFileSync(sourceFile, "utf8")));
    return;
  }

  fs.copyFileSync(sourceFile, targetFile);
}

function copyEntry(entry) {
  const sourcePath = path.join(sourceRoot, entry);
  if (!fs.existsSync(sourcePath)) return;

  const walk = (current) => {
    const stat = fs.statSync(current);
    const relativePath = path.relative(sourceRoot, current);
    const targetPath = path.join(targetRoot, convertPath(relativePath));

    if (stat.isDirectory()) {
      ensureDir(targetPath);
      for (const child of fs.readdirSync(current)) {
        walk(path.join(current, child));
      }
      return;
    }

    copyFile(current, targetPath, relativePath);
  };

  walk(sourcePath);
}

function patchProjectConfig() {
  const configPath = path.join(targetRoot, "project.config.json");
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
  config.appid = douyinAppId;
  config.projectname = "shanfeng-express-douyin-miniapp";
  config.description = "闪蜂速运抖音小程序";
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const privateConfigPath = path.join(targetRoot, "project.private.config.json");
  if (fs.existsSync(privateConfigPath)) {
    const privateConfig = JSON.parse(fs.readFileSync(privateConfigPath, "utf8"));
    privateConfig.projectname = "shanfeng-express-douyin-miniapp";
    fs.writeFileSync(privateConfigPath, `${JSON.stringify(privateConfig, null, 2)}\n`);
  }
}

function writeReadme() {
  fs.writeFileSync(path.join(targetRoot, "README.md"), `# 闪蜂速运抖音小程序\n\n这是由微信原生小程序基线转换出的抖音小程序代码包。\n\n## 当前配置\n\n- AppID: ${douyinAppId}\n- API: ${apiBaseUrl || "mock 模式，未连接真实后端"}\n\n## 打开\n\n使用抖音开发者工具导入本目录：\n\n\`\`\`text\n${targetRoot}\n\`\`\`\n\n## 上传\n\n需先在抖音开放平台创建小程序，并在 IDE 登录或使用 \`tt-ide-cli\` 配置 token。\n\n\`\`\`bash\nnpm install -g tt-ide-cli\ntma open ${targetRoot}\ntma upload -v 0.1.0 -c "闪蜂速运初始版本" ${targetRoot}\n\`\`\`\n`);
}

fs.rmSync(targetRoot, { recursive: true, force: true });
ensureDir(targetRoot);

for (const entry of copiedEntries) copyEntry(entry);
patchProjectConfig();
writeReadme();

console.log(JSON.stringify({
  ok: true,
  sourceRoot,
  targetRoot,
  appid: douyinAppId,
  mode: apiBaseUrl ? "production" : "mock",
  apiBaseUrl: apiBaseUrl || null
}, null, 2));
