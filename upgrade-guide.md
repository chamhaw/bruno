# Fork 升级指南

本 repo 是 [usebruno/bruno](https://github.com/usebruno/bruno) 的 fork。`main` 是唯一的长期 fork 主干，它永远等于「某个上游版本锚点的完整源码树」叠加「本 fork 的定制提交」。上游发新版本后按本指南升级，升级过程中 fork 定制会完整保留。

fork 主干与上游主线同名，都是 `main`。本指南约定：不带 remote 前缀的 `main` 一律指 fork 自己的主干，指上游时写 `upstream/main`。

同一套流程来自 litellm fork 的长期实践。核心是 tag 到 tag 的**三方合并**，base 取上一次的锚点树。

## 拓扑约定

| 远程 | 指向 | 用途 |
| --- | --- | --- |
| `origin` | `github.com/chamhaw/bruno` | 你的 fork，所有 push 的目标 |
| `upstream` | `github.com/usebruno/bruno` | 上游官方，只 `fetch`，绝不 `push` |

| 分支 | 含义 |
| --- | --- |
| `main` | fork 的唯一长期主干，= 上游锚点树 + fork 定制 |
| `baseline/<锚点>` | 纯净的上游锚点树，不含任何 fork 改动，升级时作为三方合并的 base |
| `upgrade/from_<旧锚点>-to_<新锚点>` | 升级期间的临时分支，完成验证后并入 `main` 并删除 |

`origin` 与 `upstream` 的方向不能反。litellm、skill、脚本里的所有 SOP 都假定 `origin` 是自己的 fork。

## bruno 的上游发布方式（与 litellm 不同，务必先读）

litellm 的 release tag 打在上游 `main` 上，可以直接按 tag 锚定。**bruno 不是这样**：release tag 打在 `release/vX.Y.Z` 分支上，`upstream/main` 是开发主线，二者会分叉。

实测结论：

- `git describe --tags --abbrev=0 upstream/main` 得到 `v3.0.0`，而 `v4.0.0`、`v4.1.0` 都不在 `upstream/main` 的祖先链上
- 只有 `v0.x` 到 `v3.0.1` 的 tag 是 `upstream/main` 的祖先
- `upstream/release/v4.2.0` 是当前最新 release 分支，它包含 fork 依赖的上游文件 `packages/bruno-app/src/utils/timeline/index.js`，而 `v4.0.0`、`v4.1.0` 都不包含

因此**升级锚点取「上游最新 release 分支的头提交」**，等该版本正式打 tag 后再前移锚点到 tag 本身（见「重新锚定」）。

当前锚点：

```
baseline/v4.2.0  =  upstream/release/v4.2.0 的 b84eca260  (2026-09-10)
```

`v4.2.0` tag 尚未发布，所以锚点先记 release 分支头的 SHA。前移锚点到 tag 时，只有 anchor 的 SHA 变了，合并配方一行都不用改。

## 本 fork 的定制清单

`main` 相对锚点的 delta 是 38 个文件、约 +2417/-135 行，落在 6 个特性上：

| 特性 | 承接的提交 |
| --- | --- |
| timeline 头部视图切换 | `feat(timeline): add headers view toggle` |
| timeline 网络日志复制 | `feat(timeline): add copy action for network logs` |
| AI debug 上下文复制 | `feat(response): add copy for AI debug context`<br>`fix(response): preserve network logs in AI debug copy` |
| openapi swagger2 同步 | `feat(openapi): support swagger2 sync` |
| 请求示例按集合排序 | `feat(sidebar): sort request examples with collection sort order` |
| 在请求中运行示例 | `feat: run request examples`<br>`refactor: make example try action side-effect free` |
| watcher 忽略列表种子 | `fix(watcher): seed the bruno config store before the initial crawl` |

随时可以用这条命令核对 fork 定制的规模。口径限定在 `packages/` 下，这样本指南、`upgrades/` 存档这类文档增删不会干扰数字：

```bash
git diff --name-only baseline/v4.2.0..main -- packages/ | wc -l          # 期望 38
git diff --name-only baseline/v4.2.0..main -- packages/ | grep -i lock   # 期望无输出
```

### 已清理的分支与有意放弃的实现

fork 的全部历史分支已于 2026-09-16 清理，`main` 是 fork 定制的唯一载体。清理前逐个分支核对过定制内容是否已在 `main` 中，只有 `dev` 上有两项未进入 `main`，均已确认放弃：

- **Copy-for-AI 的凭据脱敏**。`dev` 曾实现 `REDACTED_VALUE`、`SENSITIVE_KEY_PATTERN` 与 `redactUrl` / `redactHeaderValue` / `redactText` / `redactStructuredValue`，对 curl 命令与 URL 行做掩码。`main` 保持明文，且 `packages/bruno-app/src/utils/response/debugContextMarkdown.spec.js` 显式断言 `- Authorization: Bearer test-token` 与 `password=query-secret` 原样出现在生成结果里。这是最终意图，不是缺陷。
- **Devtools 时间线的非数组兜底**。`Devtools/Console/RequestDetailsPanel` 按数组处理 `response.timeline`，不为非数组输入构造兜底项。

升级时三方合并落到这两个文件，以 `main` 当前行为为准，不要把上述机制重新捡回来。

## 升级流程

下文设 `OLD_ANCHOR=v4.2.0`（对应分支 `baseline/${OLD_ANCHOR}`），`NEW_REF=upstream/release/v4.3.0`，`NEW_ANCHOR=v4.3.0`。实际升级时把这三个值换成当时的上游版本。

### 0. 前置

工作树必须干净，且依赖是最新的。本 repo 的 husky pre-commit hook 会跑 `npx nano-staged`，若 `node_modules` 相对当前 `package.json` 陈旧，hook 会因为找不到 plugin 而失败并挡住提交：

```bash
git status --porcelain          # 必须为空
nvm use                         # .nvmrc 钉的是 Node v22.12.0
npm i --legacy-peer-deps        # 升级前先同步依赖，避免 hook 失败
```

**分支基点判定**：第 2 步从 `main` 拉升级分支，前提是 `main` 已经是上一次升级的落点。若上一次的 `upgrade/from_*` 尚未并入 `main` 就开始下一次升级，第 1 步的 `git diff baseline/${OLD_ANCHOR}..main` 会把上次升级的全部改动一并算进本次 fork delta，patch 既无法归因也无法回放。

```bash
git branch --list 'upgrade/from_*'                     # 有残留 = 上次升级未收尾
git log --oneline main..upgrade/from_<上次锚点对>    # 非空 = 确认未并入
```

未并入时走**叠加升级**：后续各步把 `main` 换成上一升级分支的头，`OLD_ANCHOR` 换成上一目标锚点，第 6 步的 ff-merge 目标也相应前移。收尾仍应先把上一次升级并入 `main` 再开下一次，否则叠加层数会逐次累积。

### 1. 抓取上游并留档 fork delta

```bash
git fetch upstream --tags --prune
git checkout main
mkdir -p upgrades
git diff baseline/${OLD_ANCHOR}..main -- . ':(exclude)upgrades' > upgrades/${OLD_ANCHOR}..main.patch
```

### 2. 建升级分支，工作树换成新上游树

```bash
git checkout -b upgrade/from_${OLD_ANCHOR}-to-${NEW_ANCHOR} main
git read-tree -u --reset ${NEW_REF}
```

`git read-tree -u --reset` 把索引和工作树整体换成 `${NEW_REF}` 的树，上游新增的文件会出现，上游删除的文件会消失。HEAD 仍停在升级分支上，所以此时 `git status` 会显示大量差异，这是预期的起点。**这条命令会丢弃未提交的改动，执行前确认工作树干净。**

### 3. 把 fork 改动重放回新树（三方合并）

关键点：每一处 `git merge-file` 的 base 取**旧锚点树**里的该文件，ours 取**新上游版本**，theirs 取**当前 fork 版本**。base 不能取 `git merge-base`，否则上游自己在锚点之后的改动会被当成 fork 改动而回退。

```bash
OLD_ANCHOR=baseline/v4.2.0
NEW_REF=upstream/release/v4.3.0

git diff --no-renames --name-status "$OLD_ANCHOR" main | while IFS=$'\t' read -r st path; do
  case "$st" in
    A|M)
      if ! git cat-file -e "$OLD_ANCHOR:$path" 2>/dev/null; then
        git checkout main -- "$path"                      # fork 新增的文件，直接取 fork 版本
      elif ! git cat-file -e "$NEW_REF:$path" 2>/dev/null; then
        echo "REVIEW $path: 上游已删除但 fork 改过，需人工决定"
      else
        git show "$NEW_REF:$path"    > /tmp/up-ours
        git show "$OLD_ANCHOR:$path" > /tmp/up-base
        git show "main:$path"      > /tmp/up-theirs
        if git merge-file -p /tmp/up-ours /tmp/up-base /tmp/up-theirs > "$path"; then
          echo "merged  $path"
        else
          echo "CONFLICT $path"
        fi
      fi
      ;;
    D)
      if git cat-file -e "$NEW_REF:$path" 2>/dev/null && \
         ! git diff --quiet "$OLD_ANCHOR" "$NEW_REF" -- "$path"; then
        echo "REVIEW $path: fork 删除但上游改过，需人工决定"
      else
        git rm -f --ignore-unmatch "$path"
      fi
      ;;
  esac
done
```

脚本会打印 `merged` / `CONFLICT` / `REVIEW` 三类。`CONFLICT` 的文件已写入带冲突标记的内容，逐个手改；`REVIEW` 是文件级增删冲突，必须人工判断。

### 4. 已知的冲突热点

锚点每前移一次，下面几处最容易再冲突，手改时注意语义而不是取一侧了事：

- `packages/bruno-electron/src/ipc/openapi-sync.js`。fork 把 `openApiToBruno` 换成了 `./openapi-sync/spec-support` 的 `convertApiSpecToBruno`（9 个调用点）；上游会继续在此文件加东西（例如 v4.2.0 加了 `resolveEnvironmentInheritance`）。两侧都要留，不能整块取一侧。
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/index.js`。fork 引入了 `utils/collections` 的 `sortExamplesForSidebar`；上游同文件里有 `const collectionSortOrder = useSelector(...)`。fork 早期版本在文件顶部重复声明过同名变量，若再冲突要保留上游那处声明，重复声明在 ES module 里是 SyntaxError。
- `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js`。fork 在这里加过又撤过若干辅助机制（`copyDisplayName`、`generateUniqueName`、`responseExampleSendsInFlight`）。以「main 当前状态」为准，别把已撤销的机制重新捡回来。
- `packages/bruno-electron/src/app/collection-watcher.js`。fork 的修复是在初始扫描前用 `setBrunoConfig(collectionUid, brunoConfig)` 给配置存储播种；上游重构 watcher 时会动到同一段初始化路径。
- `packages/bruno-app/src/utils/collections/index.js`。fork 在此导出 `sortExamplesForSidebar`，上游也在持续改这个文件。
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/CollectionItem/ExampleItem/index.js`。最常见的冲突形态：两侧都在文件顶部同一位置添加了 import。解法是两边都保留，不是取一侧。实测这条路径在锚点前进 12 个上游提交后必冲突。

### 5. 验证

```bash
# 1) 拓扑自检：main 的 delta 只应有 fork 特性文件，无上游漂移噪声
git diff --name-only baseline/${OLD_ANCHOR}..main | wc -l

# 2) fork 特性回归测试
cd packages/bruno-electron && npx jest src/app/tests/collection-watcher.spec.js     # 1 passed
cd packages/bruno-electron && npx jest tests/ipc/openapi-sync-spec-support.spec.js  # 3 passed
cd packages/bruno-app && npx jest \
  src/utils/collections/sort-examples-for-sidebar.spec.js \
  src/utils/collections/buildSidebarEntries.spec.js \
  src/utils/collections/index.spec.js \
  src/utils/timeline/index.spec.js \
  src/utils/response/debugContextMarkdown.spec.js \
  src/utils/ai/index.spec.js                                                        # 6 suites / 98 tests

# 3) 构建
npm run build:web               # bruno-app 打包
npm run build:bruno-filestore   # 受 schema 漂移影响最敏感的包

# 4) e2e：fork 改写过上游有 e2e 覆盖的组件，这一层只有 e2e 能兜
npx playwright test tests/response/timeline-headers/ --project=default
npx playwright test tests/response/response-actions.spec.ts --project=default
npx playwright test tests/response-examples/ --project=default
npx playwright test tests/collection/ tests/sidebar/ --project=default
```

第 4 项不可省。fork 的 `feat(timeline): add headers view toggle` 把 `Timeline/TimelineItem/Common/Headers/index.js` 改了 +123/-38，而该组件正是上游 `#8857` 引入、并附带 e2e `tests/response/timeline-headers/` 的。fork 的单测（`Headers/index.spec.js`）只断言 fork 自己加的逻辑，对上游行为的回归完全无感；`npm run build:web` 也只在语法层面兜底。上游与 fork 在同一组件上继续分头改动时，三方合并的结果只有 e2e 能判。上面四条对应 fork 改写过的四个组件族。`OpenAPISyncTab/` 的 UI 层没有 e2e 覆盖，那里只有单测 `openapi-sync-spec-support.spec.js`（3 tests）兜底，升级后需要人工过一遍同步流程。全量 `npx playwright test --project=default` 是更彻底的选项，代价是耗时。

若构建报 `export 'xxx' was not found in '@usebruno/common/utils'` 一类错误，先怀疑内部包的 `dist` 陈旧，重跑

```bash
npm i --legacy-peer-deps && npm run setup
```

`packages/*/package.json` 里的依赖版本漂移（例如 `@rsbuild/core` 从 1.1.2 跳到 1.7.6）会让旧 `dist` 与新 `package.json` 不匹配，这类失败是环境陈旧，不是合并写坏了。

### 6. 收尾

```bash
git add -A
git commit -m "upgrade: merge upstream <新版本> into the fork tree"

git checkout main
git merge --ff-only upgrade/from_${OLD_ANCHOR}-to-${NEW_ANCHOR}

# 轮转基准点：新锚点接棒，旧的 baseline 分支删除
git branch baseline/${NEW_ANCHOR} ${NEW_REF}
git branch -D baseline/${OLD_ANCHOR}
git branch -D upgrade/from_${OLD_ANCHOR}-to-${NEW_ANCHOR}

# 存档本次升级后的 fork delta，供下次升级对照
git diff baseline/${NEW_ANCHOR}..main -- . ':(exclude)upgrades' > upgrades/${NEW_ANCHOR}..main.patch

git push origin main
git push origin baseline/${NEW_ANCHOR}
```

## 重新锚定

上游正式打出 `v4.2.0` tag 后，把锚点从 release 分支头前移到 tag 本身：

```bash
git fetch upstream --tags
git log --oneline upstream/release/v4.2.0...v4.2.0    # 先确认两者差异，通常 tag 是分支头的祖先或等价
git branch -f baseline/v4.2.0 v4.2.0
git push origin baseline/v4.2.0
```

记进本文件的「当前锚点」一节的 SHA 也要同步更新。

## 回滚方案

`main` 在 ff-merge 之前不被触碰，所以回滚成本按阶段递增：

| 阶段 | 回滚动作 |
| --- | --- |
| 第 2 步之后 | `git checkout main` 后 `git branch -D upgrade/from_<锚点对>`，换过树的工作树直接丢弃 |
| 第 3–5 步 | 同上。`upgrade/` 分支未并入 `main`，不留污染 |
| 第 6 步 ff-merge 之后 | `main` 回退到升级前的提交：`git reset --hard <升级前 main>`；若已 push，再 `git push --force-with-lease origin main` |

第 2 步换树会就地改动工作树，动手前先记下回滚锚点，否则 ff-merge 之后无法定位升级前的 `main`：

```bash
git rev-parse main    # 记下输出，作为本次升级的回滚锚点
```

强推属外向不可逆操作，执行前必须确认。`upgrades/` 下的历史 patch 与 `baseline/*` 分支是升级过程的存档，回滚时不需要改动它们。

## 本配方的验证记录

2026-09-15 用 `upstream/main`（比锚点新 12 个上游提交，比真实升级更激进）对第 3 步的脚本做过一次受控干跑：

- 38 个 fork delta 文件全部有归宿：22 个 merged、15 个 fork-new、1 个 CONFLICT
- 唯一冲突是 `ExampleItem/index.js` 的 import 块，两侧保留后 `node --check` 通过
- 干跑产物上跑 fork 特性测试：electron 2 suites / 4 tests、bruno-app 6 suites / 112 tests，全绿
- 关键符号两全：fork 的 `convertApiSpecToBruno`（9 处）、`sortExamplesForSidebar`、`setBrunoConfig`，与上游 v4.2.0 新增的 `resolveEnvironmentInheritance`（2 处）同时存在

2026-09-16 复核：以同一 `upstream/main` 干跑第 3 步脚本（merge-file 输出写临时目录，不落工作树），复现 22 个 merged、15 个 fork-new、1 个 CONFLICT，合计 38；上游 `main` 相对锚点确为 12 个提交；唯一冲突仍是 `ExampleItem/index.js`；干跑结束后 `git status --porcelain` 为空。`main` 上按第 5 步跑 6 个 spec 为 6 suites / 98 tests 全绿。

配方本身是可执行的，不是纸面流程。

## 硬规则

- **禁止 rebase-diff 式迁移**。`git diff baseline > patch` 加 `git apply`（litellm 早期指南的写法）会在上游改动与 fork 改动同处一段时静默取一侧，从而悄悄回退上游内容。必须用第 3 步的 `git merge-file` 三方合并。
- **三方合并的 base 必须是上一次的锚点树**，不能是 `git merge-base`。
- **禁止 `-X theirs` / `-X ours` 整块取一侧**。历史上有一次 `-X theirs` 直接把上游在 `openapi-sync.js` 里的 `resolveEnvironmentInheritance` 改动回退了。
- **不碰 `package-lock.json`**。fork 特性不应改动 lock；升级时锁文件取上游新版本，若合并过程把它卷进 fork delta，说明操作有误。
- **绝不 push 到 `upstream`**。全程只 `fetch`。
- **`git read-tree -u --reset` 与 `git checkout <ref> -- .` 会丢弃未提交改动**，执行前确认 `git status --porcelain` 为空。
- **`git push` 前必须确认**。push 是外向不可逆操作。

## 排除可能性后仍失败时的排查顺序

1. `git diff --name-only baseline/<锚点>..main | grep -i lock` 有输出 → 升级过程卷入了 lock，回退重做
2. 构建报找不到某个 `@usebruno/*` 导出 → 内部包 `dist` 陈旧，重跑 `npm run setup`
3. 测试失败但 `git diff` 显示该文件只是上游正规改动 → 说明锚点选错，检查是否误用了 `v4.0.0` / `v4.1.0` 这类不含依赖的旧锚点
