# 部署到 Git 静态托管

## 先看版权

Hamilton 的歌词和录音有版权。**GitHub Pages / Cloudflare Pages 的站点默认是公开的**，任何人拿到 URL 都能看歌词、下载音频。自用请至少加访问控制，或改用 Tailscale 私有网络（见文末）。

## 构建

```bash
cd musical-english
python dev/build_static.py
```

生成 `dist/`：`index.html`、`assets/`、`js/`、`content/`、`audio/`、`.nojekyll`、`robots.txt`。约 100 MB，其中音频 98 MB（单声道 AAC 96 kbps）。

本地预览：

```bash
python -m http.server 8791 --directory dist
# 打开 http://127.0.0.1:8791/
```

## 方案 A：GitHub Pages（免费，实测最快）

> **发布是手动的**：`.github/workflows/pages.yml` 只留了 `workflow_dispatch`，`git push` 不会上线；改完、本地验完再执行 `dev/publish.sh` 或 `gh workflow run pages.yml`。要恢复推自动发布，把 `on.push` 两行取消注释即可。

> 一键发布：`dev/publish.sh`（先 `gh auth login`）。它会建公开仓库、推送、把 Pages 设成 GitHub Actions 并触发一次部署，最后打印站点地址。

> 国内实测（上海移动，2026-11-14）：`necolas.github.io` 连测 3 次均 200，热连接 TTFB **0.26s**、冷启动 1.9s；同期 `svelte.pages.dev` TTFB **4.0–6.8s**。所以日常用 GitHub Pages 更快，Cloudflare 只在需要**私有仓库 / 响应头可控 / 不限带宽**时才值得多开一个平台。

### 没有 Git：用 GitHub Desktop（最快）

1. 安装 [GitHub Desktop](https://desktop.github.com/)，用 GitHub 账号登录。
2. **File → Add local repository**，选 `musical-english` 文件夹；提示不是 Git 仓库时选 **create a repository here**。
3. 名称填 `musical-english`，不要勾 “Initialize with README”（已有 README）。
4. 左下角填提交信息（如 `剧读: 46 首`），点 **Commit to main**。
5. 右上角 **Publish repository**，**取消勾选 “Keep this code private”**（公开），发布。
6. 打开 GitHub 仓库页 → **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
7. 到 **Actions** 里重新运行一次 `Deploy to GitHub Pages`；完成后地址是 `https://<用户名>.github.io/musical-english/`。

第一次推送约 160 MB，等几分钟。

### 有 Git：命令行

1. 建一个 GitHub 仓库（免费账号的 Pages 需要**公开仓库**；私有仓库的 Pages 需要 GitHub Pro，但站点仍然公开）。
2. 在 `musical-english/` 里：

   ```bash
   git init -b main
   git add .
   git commit -m "剧读: 46 首"
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

   仓库约 160 MB，第一次推会慢；用 GitHub Desktop 也可以。

3. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. 推上去后 `.github/workflows/pages.yml` 会自动构建并发布；也可以在 Actions 里手动 Run workflow。
5. 地址：`https://<用户名>.github.io/<仓库名>/`。

说明：

- Pages 的访问控制只有 **GitHub Enterprise Cloud** 才有；个人账号/Pro 的私有仓库 Pages 也是公开站点。
- `.nojekyll` 已生成，避免 Jekyll 处理；`robots.txt` 只是减少搜索引擎收录，**不是**访问控制。
- 音频走 GitHub Pages 的带宽（软限制约 100 GB/月）；一次全剧约 98 MB，个人够用。

## 方案 B：Cloudflare Pages（需要私有仓库或更大带宽时）

98 MB 音频走 CDN 不计流量费；单文件上限 25 MB（你最大 4.4 MB），文件数上限 2 万（你 100 出头）；可以用 `_headers` 给 `.m4a` 指定 `audio/mp4` 并加缓存（平台是否采纳 Content-Type 以实测为准，见下面第 8 条）。

1. 仓库先推到 GitHub（**私有仓库也行**，Cloudflare 读得到；这点比 GitHub Pages 自由）。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选仓库。
3. 构建设置：
   - Framework preset：`None`
   - Build command：`python dev/build_static.py`
   - Build output directory：`dist`
   - 环境变量：`PYTHON_VERSION=3.11`
4. 仓库根目录的 `_headers` 会被构建脚本拷进 `dist/`，生效后：全站 `X-Robots-Tag: noindex`、`/audio/*` 带缓存头与 `audio/mp4`。
5. 默认地址 `https://<项目>.pages.dev/`，可绑自定义域名；`DEPLOY.md` 后面的 Access 方案同样适用。
6. 每次 push 自动构建（免费 500 次/月）；不想接 Git 也可以 `npx wrangler pages deploy dist` 直接上传。
7. Netlify 接同一个仓库也可以，构建命令/目录由根目录的 `netlify.toml` 提供，`_headers` 同样生效。
8. GitHub Pages 实测（2026-11-14 线上）：`.m4a` 返回 `content-type: audio/mp4`、`accept-ranges: bytes`、Range 请求 206，逐句播放和拖进度条都正常，**不需要改扩展名**。
9. 换托管商时复查 MIME：`curl -I https://<域名>/audio/hamilton/01-alexander-hamilton.m4a | grep -i content-type`。若返回不是 `audio/mp4`：把 46 个音频改成 `.mp4`，同步替换 `tracks.js` 的 `file` 与各 pack 的 `audioSrc`，再跑 `node dev/validate_packs.js`。

## 登录保护（可选，但建议）

| 方案 | 费用 | 覆盖 | 难度 | 说明 |
| --- | --- | --- | --- | --- |
| GitHub Pages 自带 | 无 | 无 | — | 个人账号没有访问控制 |
| Cloudflare Access | 免费（≤50 人） | 自定义域名 | 中 | 邮箱一次性验证码 / Google / GitHub 登录 |
| Netlify Pro 密码 | 约 $19/月 | 全站（含 netlify.app） | 低 | 一个共享密码，最省心 |
| Cloudflare Worker Basic Auth | 免费 | 自定义域名 | 中 | 共享密码，自己写几十行 Worker |
| Tailscale | 免费 | 私有网络 | 低 | 没有公开站点，电脑需开机 |

### Cloudflare Access（推荐给“想发链接又不想公开”）

前置：一个域名，DNS 托管在 Cloudflare。

1. GitHub Pages 加自定义域名，例如 `music.example.com`；DNS 加 CNAME 指向 `<用户名>.github.io`。
2. Cloudflare Zero Trust → Access → Applications → Add an application → Self-hosted。
3. 域名填 `music.example.com`，策略选 Allow，条件填你的邮箱（或 Google/GitHub 账号）。
4. 保存后，访问会先跳 Cloudflare 登录页；免费版最多 50 个用户。

**必须验证源站绕过**：配好自定义域名后，用无痕窗口直接访问 `https://<用户名>.github.io/<仓库名>/`。如果它 301 跳转到自定义域名，说明 Access 能覆盖；如果还能直接打开，说明源站可绕过，需要换 Netlify Pro 或私有网络。

注意：GitHub 验证自定义域名时，Cloudflare 的代理（橙云）可能导致验证失败；可先切成 DNS only（灰云）完成验证，再开代理。

### Netlify Pro 密码

Netlify 的 Password Protection 在 **Pro 及以上** 才有，Free/Personal 不支持（[官方文档](https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection.md)）。设置后整个站点（包括 `*.netlify.app`）都要密码，最省心，但按月付费。

### 真正私有：Tailscale

不部署公网，电脑装 Tailscale，手机也装，访问 `http://100.x.x.x:8765/`。没有公开 URL，不涉及版权扩散；缺点是电脑要开机。

## 上线检查

- [ ] 首页 200，46 首都能进精读
- [ ] 音频能播放，拖动进度条正常（需要服务器支持 Range；GitHub Pages / Cloudflare Pages 支持）
- [ ] 手机浏览器打开，逐句播放正常
- [ ] 自定义域名 HTTPS 正常
- [ ] 如果加了 Access，无痕窗口直接访问源站地址确认不能绕过
- [ ] `robots.txt` 已生效（仅减少收录，不防访问）
- [ ] 页面底部「仅个人学习 / 请勿商用 / 侵权联系」声明可见，邮箱可点
- [ ] `curl -I https://<域名>/audio/hamilton/01-alexander-hamilton.m4a` 返回 `content-type: audio/mp4`
- [ ] （Cloudflare）响应头里有 `x-robots-tag: noindex, nofollow`
