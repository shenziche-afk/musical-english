# 在 Mac 上建仓并发布

这个包是 46 首完整版，约 160 MB（音频 152 MB）。

## 1. 解压

把 `musical-english-mac.zip` 解压到 `~/Documents/musical-english`（路径不要带特殊符号）。

## 2. 本地先跑一遍（可选）

终端：

```bash
cd ~/Documents/musical-english
chmod +x start.command
./start.command
```

或 `python3 server.py`。终端会打印本机和局域网地址；按 Ctrl+C 停止。

> 不需要联网。只有 GitHub Desktop 推送时才需要网络。

## 3. GitHub Desktop 建仓

1. 安装并登录 [GitHub Desktop](https://desktop.github.com/)。
2. **File → Add local repository**，选 `~/Documents/musical-english`。
3. 提示不是 Git 仓库时，选 **create a repository here**：
   - Name：`musical-english`
   - 不要勾 “Initialize with README”（项目已有 README）
4. 左下角提交信息填 `剧读: 46 首`，点 **Commit to main**。
5. 右上角 **Publish repository**，**取消勾选 “Keep this code private”**，发布为公开仓库。
6. 第一次推送约 160 MB，等几分钟。

## 4. 开启 GitHub Pages

1. 打开仓库页 → **Settings → Pages**。
2. **Build and deployment → Source** 选 **GitHub Actions**。
3. 到 **Actions** 标签，运行 `Deploy to GitHub Pages`（如果推送时已经自动跑过但失败了，点 **Re-run all jobs**）。
4. 完成后地址：

   `https://<你的用户名>.github.io/musical-english/`

## 5. 如果 start.command 没有执行权限

```bash
chmod +x start.command
```

或者在 Finder 里右键 → 打开。

## 6. 注意

- `dist/` 不会提交（`.gitignore` 已排除）；GitHub Actions 会在云端运行 `python dev/build_static.py` 构建。
- 音频单文件都小于 100 MB，GitHub 可以直接收；不需要 Git LFS。
- 公开仓库 = 歌词和原声对所有人可下载，版权风险已知悉；后续要加登录，见 `DEPLOY.md` 的 Cloudflare Access / Netlify Pro。
- 网络不方便时可以先只 Commit，本地随时能跑；等有网再 Publish。
