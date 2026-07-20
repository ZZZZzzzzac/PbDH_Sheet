# PbDH Sheet Release 与生产部署

本文是维护者操作手册。公开地址为 `https://daggerheart.cn/pbdh/`。生产服务器只运行 Nginx，不安装 Node.js、不执行构建。

## 1. 版本规则

版本格式为 `X.Y.Z`，tag 为 `vX.Y.Z`：

- `X`：Base Framework 大改；递增后 `Y`、`Z` 归零。
- `Y`：任一正式内置 System Package 大改；递增后 `Z` 归零。
- `Z`：兼容功能、修复、样式、文档、正式 System Package 小改，以及 demo 改动。

正式内置 System Package 指 `public/system-packages/` 下除 `demo`、`demo-minimal` 外实际交付给 Player 的包。改动是否为“大改”由发布者判断，CI 不自动推断。

对应命令：

```powershell
# Base Framework 大改
npm version major --no-git-tag-version

# 正式内置 System Package 大改
npm version minor --no-git-tag-version

# 其他改动
npm version patch --no-git-tag-version
```

命令会同步更新 `package.json` 和 `package-lock.json`。Release workflow 要求两者版本一致，且 tag 必须等于 `v${version}`。

## 2. 发布架构

```text
push vX.Y.Z tag
  -> Release workflow
  -> 校验 tag/version
  -> 单测 + 构建 + /pbdh/ 产物检查
  -> pbdh-sheet-X.Y.Z.tar.gz + SHA-256
  -> GitHub Release

手动运行 Deploy Release
  -> production environment 审批
  -> 下载并校验已有 Release
  -> SSH 流式解包到新 staging 目录
  -> 校验 index.html 版本标记
  -> 移入 releases/X.Y.Z
  -> 原子切换 current 软链接
  -> 请求公开 URL 校验版本
```

服务器目录：

```text
/var/www/pbdh/
├── current -> releases/X.Y.Z
├── releases/
│   ├── X.Y.Z/
│   └── ...
└── .staging/
```

Release 不覆盖、不自动清理。重新部署旧版本即回滚。失败 staging 留在服务器供检查，不执行删除。

## 3. 一次性创建专用部署账号

不要把现有 `ubuntu` 私钥交给 GitHub Actions：该账号有免密 `sudo`。创建无 `sudo` 的专用账号。

### 3.1 本地生成专用 SSH key

在 PowerShell 执行；passphrase 留空，否则 GitHub Actions 无法非交互使用：

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\pbdh-github-actions" -C "github-actions-pbdh"
Get-Content "$HOME\.ssh\pbdh-github-actions.pub"
```

私钥 `pbdh-github-actions` 只放 GitHub Secret。公钥 `pbdh-github-actions.pub` 安装到服务器。

### 3.2 在生产服务器创建账号和目录

先使用现有运维账号连接：

```powershell
ssh -i "$HOME\.ssh\ssh-key-2026-03-20.key" ubuntu@151.145.76.60
```

在服务器执行；把 `<PUBLIC_KEY>` 替换为完整公钥单行：

```bash
sudo adduser --disabled-password --gecos "" pbdh-deploy
sudo install -d -o pbdh-deploy -g pbdh-deploy -m 0755 /var/www/pbdh
sudo install -d -o pbdh-deploy -g pbdh-deploy -m 0700 /home/pbdh-deploy/.ssh
printf '%s\n' 'restrict <PUBLIC_KEY>' | sudo tee -a /home/pbdh-deploy/.ssh/authorized_keys
sudo chown pbdh-deploy:pbdh-deploy /home/pbdh-deploy/.ssh/authorized_keys
sudo chmod 0600 /home/pbdh-deploy/.ssh/authorized_keys
```

`restrict` 禁用端口转发、代理转发和 PTY；部署所需的非交互 `bash`、`tar`、`ln`、`mv` 仍可运行。

本地验证专用 key，成功结果应显示 `pbdh-deploy`，且 `sudo` 不可用：

```powershell
ssh -i "$HOME\.ssh\pbdh-github-actions" pbdh-deploy@151.145.76.60 "id; if sudo -n true 2>/dev/null; then echo DEPLOY_ACCOUNT_HAS_SUDO; exit 1; else echo DEPLOY_ACCOUNT_OK; fi"
```

## 4. 配置 Nginx

在 `daggerheart.cn` 的 HTTPS `server` 块加入：

```nginx
location = /pbdh {
    return 301 /pbdh/;
}

location /pbdh/ {
    alias /var/www/pbdh/current/;
    index index.html;
    add_header Cache-Control "no-cache" always;
}
```

这里不使用长时间 `immutable` 缓存：System Package 内资源路径可能稳定但内容会随版本变化。`no-cache` 允许浏览器缓存，同时要求每次重验证，避免 Cloudflare 或浏览器长期返回旧包。

修改生产 Nginx 前，先同步修改 `Daggerheart_VPS/daggerheart_tools/nginx_daggerheart.conf`。生产操作必须先验证：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

首次 Release 尚未部署时 `/pbdh/` 返回 404 属正常；Nginx reload 不依赖 `current` 已存在。

## 5. 配置 GitHub production environment

打开仓库：`Settings -> Environments -> New environment`，名称必须为 `production`。

建议：

- 配置 Required reviewers，让 Deploy workflow 上线前停在审批点。
- 单人维护时不要启用“Prevent self-review”，否则自己触发后无法批准。
- 若当前 GitHub 套餐不支持 environment reviewer，`workflow_dispatch` 仍保证部署只能手动启动。

### Environment variables

在 `production -> Environment variables` 添加：

| Name | Value |
| --- | --- |
| `DEPLOY_HOST` | `151.145.76.60` |
| `DEPLOY_USER` | `pbdh-deploy` |
| `DEPLOY_PATH` | `/var/www/pbdh` |
| `PUBLIC_URL` | `https://daggerheart.cn/pbdh/` |

这些不是密码，使用 Variables 而非 Secrets。

### Environment secrets

在 `production -> Environment secrets` 添加：

| Name | 内容 |
| --- | --- |
| `DEPLOY_SSH_KEY` | `pbdh-github-actions` 私钥全文，含 BEGIN/END 行 |
| `DEPLOY_KNOWN_HOSTS` | 已核验的生产服务器 SSH host key 行 |

不要把这些值发到 issue、提交到仓库或粘贴进日志。

生成 host key 候选并查看指纹：

```powershell
ssh-keyscan -t ed25519 151.145.76.60 | ssh-keygen -lf -
```

在已可信连接的服务器上查看真实指纹：

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

两边 SHA256 指纹完全一致后，将以下命令的完整输出保存为 `DEPLOY_KNOWN_HOSTS`：

```powershell
ssh-keyscan -t ed25519 151.145.76.60
```

## 6. 创建 GitHub Release

先在准备发布的 commit 更新版本并完成本地验证：

```powershell
npm run test:release
npm test
npm run build
npm run verify:release-build
npm run test:e2e
```

提交版本变更后创建 tag。以下 `push` 命令必须由维护者手动执行：

```powershell
$version = (Get-Content -Raw package.json | ConvertFrom-Json).version
git tag -a "v$version" -m "Release v$version"
git push origin main
git push origin "v$version"
```

tag push 触发 `Release` workflow。成功后 GitHub Releases 出现：

- `pbdh-sheet-X.Y.Z.tar.gz`
- `pbdh-sheet-X.Y.Z.tar.gz.sha256`
- 自动生成的 Release Notes

## 7. 部署或回滚

打开 `Actions -> Deploy Release -> Run workflow`，输入不带 `v` 的版本号，例如 `1.3.0`。

workflow 只接受：

- 符合 `X.Y.Z` 格式的明确版本。
- 已存在、非 draft、非 prerelease 的 GitHub Release。
- SHA-256 校验通过的产物。

部署成功条件：

- 新目录完整进入 `releases/X.Y.Z`。
- `current` 原子切换。
- `PUBLIC_URL` 返回 `<meta name="pbdh-version" content="X.Y.Z">`。

回滚：再次运行 `Deploy Release`，输入旧版本。workflow 校验服务器上旧 Release 的 checksum marker 后直接切换，不重新构建或覆盖文件。

## 8. 故障处理

### Release workflow 在 tag/version 校验失败

不要移动已有 tag。修正 `package.json` 和 `package-lock.json`，提交后创建新版本 tag。

### Deploy 在原子切换前失败

原 `current` 保持不变。检查 workflow 日志和服务器 `.staging/`。需要隔离失败目录时，将它移动到人工检查区，不直接删除：

```bash
mkdir -p /var/www/pbdh/quarantine
mv /var/www/pbdh/.staging/<VERSION-RUN> /var/www/pbdh/quarantine/
```

### Deploy 在公开健康检查失败

文件可能已切换，但 Cloudflare/Nginx/域名响应不符合预期。立即用上一版本再次运行 `Deploy Release`，再检查：

```bash
readlink -f /var/www/pbdh/current
curl -I https://daggerheart.cn/pbdh/
curl -fsS 'https://daggerheart.cn/pbdh/?health=manual'
```

不要手动覆盖 `releases/` 中已有版本；checksum 不一致时 workflow 会拒绝复用。
