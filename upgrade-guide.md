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
| `feat/*` | 独立功能候选；贡献上游的分支从实际 PR base 建立，产品内已有等价实现也须保留到 PR 关闭 |

本仓库采用「正式 release 上的产品定制＋独立上游贡献」模式。`upstream/main` 提供贡献基线，不增加本地镜像 `main` 或产品 `master`；`integration/*` 不再作为第二条长期产品线。上游 PR 合并后，仍须确认产品所选 release 已包含等价行为，才能清退产品补丁。

本机 `upstream` 的 push URL 为 `DISABLED`，fetch URL 保持官方仓库；其他 clone 也应单独设置只读推送目标。固定的 `baseline/*` 不跟踪可变的 release 分支，禁止通过 `git pull` 移动锚点。

`origin` 与 `upstream` 的方向不能反。litellm、skill、脚本里的所有 SOP 都假定 `origin` 是自己的 fork。

## bruno 的上游发布方式（与 litellm 不同，务必先读）

litellm 的 release tag 打在上游 `main` 上，可以直接按 tag 锚定。**bruno 不是这样**：release tag 打在 `release/vX.Y.Z` 分支上，`upstream/main` 是开发主线，二者会分叉。

正式发布时优先取 release tag；只有版本尚未打 tag 时才临时取 release 分支头并记录 SHA。发布后的重新锚定必须走同一升级流程，不能只移动 baseline。

当前正式目标：`v4.2.0`，SHA `8efe082a915c8fe68e17e2772c4f6ebe971b7311`。
候选分支 `upgrade/from_v4.2.0-preview-to-v4.2.0` 从旧基准 `b84eca26095d9e9bc1ed2b4abcefa6979fe68803` 合并正式 tag；验证完成并合入 `main` 后，才将 `baseline/v4.2.0` 轮转至正式 tag。

## 本 fork 的定制清单

正式 v4.2.0 候选相对正式 tag 的代码 delta 是 37 个文件，落在以下特性上：

| 特性 | 承接的提交 |
| --- | --- |
| timeline 头部视图切换 | `feat(timeline): add headers view toggle` |
| timeline 网络日志复制 | `feat(timeline): add copy action for network logs` |
| AI debug 上下文复制 | `feat(response): add copy for AI debug context`<br>`fix(response): preserve network logs in AI debug copy` |
| openapi swagger2 同步 | `feat(openapi): support swagger2 sync` |
| 请求示例按集合排序 | `feat(sidebar): sort request examples with collection sort order` |
| 在请求中运行示例 | `feat: run request examples`<br>`refactor: make example try action side-effect free` |
| watcher 忽略列表种子 | 正式 v4.2.0 已包含相同修复；清退代码定制，保留回归测试 |

随时可以用这条命令核对 fork 定制的规模。口径限定在 `packages/` 下，这样本指南、`upgrades/` 存档这类文档增删不会干扰数字：

```bash
git diff --name-only baseline/v4.2.0..main -- packages/ | wc -l          # 正式版本收尾后期望 37
git diff --name-only baseline/v4.2.0..main -- packages/ | grep -i lock   # 期望无输出
```

### 分支与工作区治理（2026-10-06）

`main` 是唯一产品主干，但并非所有 fork 工作都已合入。核查范围包括 origin 的全部分支、全部本地分支、两个 worktree 和一项 stash；代码承接按补丁与目标行为判断，不只依赖提交祖先关系。此前“全部历史分支已清理”的说明不成立；此次完成备份与承接核查后，已删除八条远端历史分支。

| 载体（含退役前 ref） | 核查时 SHA | 归属与处理 |
| --- | --- | --- |
| `main` / `origin/main` | `bc889f15e` | 已集成定制，仍基于预发布锚点；正式升级尚未合入 |
| `baseline/v4.2.0` | `b84eca260` | 固定旧锚点；正式升级进入产品主干后才移动到 `8efe082a9` |
| `upgrade/from_v4.2.0-preview-to-v4.2.0` | `a3052df7e` | 已推送的正式升级候选；验收边界见下文，不包含 MCP |
| `worktree-feat+mcp-new-request` / `origin/feat/mcp-new-request` | `e4a4b6de2` | 唯一未集成功能；远端备份完成，保留独立候选及锁定 worktree |
| `origin/feat/timeline-network-copy` | `bb0fb9a3c` | 产品已承接，但上游 [PR #8869](https://github.com/usebruno/bruno/pull/8869) 仍 OPEN，保留贡献分支 |
| `origin/feat/response-debug-copy-tools` | `cb7ba3ef6` | 被 network-copy 分支替代；上游 [PR #8868](https://github.com/usebruno/bruno/pull/8868) CLOSED，已退役 |
| `origin/feat/copy-for-ai-debug-context` | `d23b1f373` | `0be35a9a6` 承接，`9df3313d9` 修正完整网络日志；已退役 |
| `origin/feat/timeline-headers-view-toggle` | `65b6aacbb` | `959e6f323` 承接；字体偏好及只读 Bulk 已保留，已退役 |
| `origin/feat/swagger2-openapi-sync-3-5-3` | `17d5e758d` | `97e9c55c9` 承接；旧版本差异不作为新功能重放，已退役 |
| `origin/feat/swagger2-openapi-sync-4-0-0` | `c07199ba6` | 同上；转换适配器及回归测试内容一致，已退役 |
| `origin/integration/response-debug-tools` | `0df2532b2` | 五项定制均被产品承接，不作为 PR 来源，已退役 |
| `origin/integration/20260815-201157-response-debug-swagger2` | `565502798` | 上述定制及 watcher 均有归宿；正式上游已包含 watcher 修复，已退役 |
| `origin/dev` | `2e2226e3b` | 有效定制已承接，字体修复 `b0d2012ef` 也已保留；两项有意放弃的行为见下文，已退役 |
| `stash@{0}` | `f039056fd` | 仅把 app package version 从 `2.0.0` 改成 `3.5.3`；当前正式 tag 仍使用 `2.0.0`，不恢复此旧版本改动，暂保留存档 |

MCP 候选改动五个文件，其六项请求生成单测通过；与正式升级候选的 `git merge-tree --write-tree` 无文本冲突，但这不代表行为验收通过。合入前须验证新建、保存、重开后的 HTTP POST、headers 与 JSON-RPC body，并实际调用目标服务的 tools/list、tools/call。协议版本固定为 `2026-07-28`，目标服务兼容性未验证。不得把这些待验证项记成已完成。

两个 worktree 均无未提交改动。MCP worktree 保持原锁；锁内 PID 已不存在，但会话归属未核实，不自动解锁或删除。忽略的依赖、构建产物及工具会话目录不作为 fork 功能，也不在此次清理中删除。

上述八个历史分支均不受保护，无开放 PR；按精确 SHA 的 lease 与原子 push 删除完成。开放贡献、升级候选和 MCP 保留。后续退役也须重新 fetch、核对 SHA、PR 状态与可恢复备份，不能按本表旧快照直接删除。正式升级进入 main 后才轮转 baseline，检查 patch 与代码 delta 一致，随后退役已落入主干的升级及治理候选。

本机已保存上述八个 ref 的完整历史 bundle：`.git/fork-archives/2026-10-06.L2g3Is/retired-origin-branches.bundle`，`git bundle verify` 通过，并在独立空 bare repo 恢复出八个相同 SHA 的 ref。备份不随仓库 push；保留本机存档，不能将临时目录或会过期的 reflog 视为唯一恢复来源。

新增功能必须记录其归属（上游贡献、长期定制、临时回补）、独立候选、产品承接提交和验收状态。只有所有仍有效的工作均已承接，或明确列为待验收/放弃，才能声明“梳理完成”；只有相应 refs 实际删除后才能声明“分支清理完成”。本表记录核查快照，后续变更须更新对应行，不保留过时的全量完成声明。

### 有意放弃的实现

以下历史行为不重新引入：

- **Copy-for-AI 的凭据脱敏**。`dev` 曾实现 `REDACTED_VALUE`、`SENSITIVE_KEY_PATTERN` 与 `redactUrl` / `redactHeaderValue` / `redactText` / `redactStructuredValue`，对 curl 命令与 URL 行做掩码。`main` 保持明文，且 `packages/bruno-app/src/utils/response/debugContextMarkdown.spec.js` 显式断言 `- Authorization: Bearer test-token` 与 `password=query-secret` 原样出现在生成结果里。这是最终意图，不是缺陷。
- **Devtools 时间线的非数组兜底**。`Devtools/Console/RequestDetailsPanel` 按数组处理 `response.timeline`，不为非数组输入构造兜底项。

升级时三方合并落到这两个文件，以 `main` 当前行为为准，不要把上述机制重新捡回来。

## 升级流程

下文设 `OLD_ANCHOR=v4.2.0`（对应分支 `baseline/${OLD_ANCHOR}`），`NEW_REF=upstream/release/v4.3.0`，`NEW_ANCHOR=v4.3.0`。实际升级时把这三个值换成当时的上游版本。

### 0. 前置

工作树必须干净，且依赖与锁文件一致。安装依赖须先获得授权；已有依赖时只运行所需构建，禁止用 `npm run setup`，该脚本递归清理依赖并可能波及嵌套 worktree。本 repo 的 husky pre-commit hook 会跑 `npx nano-staged`，若 `node_modules` 相对当前 `package.json` 陈旧，hook 会因为找不到 plugin 而失败并挡住提交：

```bash
git status --porcelain          # 必须为空
nvm use                         # .nvmrc 钉的是 Node v22.12.0
npm ci --legacy-peer-deps       # 仅在获准恢复依赖时执行，不改锁文件
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
git diff baseline/${OLD_ANCHOR}..main -- packages/ > upgrades/${OLD_ANCHOR}..main.patch
```

### 2. 建升级分支，工作树换成新上游树

```bash
git checkout -b upgrade/from_${OLD_ANCHOR}-to-${NEW_ANCHOR} main
git read-tree -u --reset ${NEW_REF}
```

`git read-tree -u --reset` 把索引和工作树整体换成 `${NEW_REF}` 的树，上游新增的文件会出现，上游删除的文件会消失。HEAD 仍停在升级分支上，所以此时 `git status` 会显示大量差异，这是预期的起点。**这条命令会丢弃未提交的改动，执行前确认工作树干净。**

### 3. 把 fork 改动重放回新树（三方合并）

关键点：每一处 `git merge-file` 的 base 取**旧锚点树**里的该文件，ours 取**新上游版本**，theirs 取**当前 fork 版本**。禁止未经核对采用 `git merge-base`，否则上游自己在锚点之后的改动可能被当成 fork 改动而回退。若已确认共同祖先恰好等于旧 baseline，可直接使用原生 `git merge --no-commit --no-ff <新上游>`；其三方合并的 base 与本配方一致。

```bash
OLD_BASE=baseline/v4.2.0
NEW_REF=upstream/release/v4.3.0

MERGE_TMP=$(mktemp -d)
trap 'rm -rf "$MERGE_TMP"' EXIT
git diff --no-renames --name-status "$OLD_BASE" main | while IFS=$'\t' read -r st path; do
  case "$st" in
    A|M)
      if ! git cat-file -e "$OLD_BASE:$path" 2>/dev/null; then
        git checkout main -- "$path"                      # fork 新增的文件，直接取 fork 版本
      elif ! git cat-file -e "$NEW_REF:$path" 2>/dev/null; then
        echo "REVIEW $path: 上游已删除但 fork 改过，需人工决定"
      else
        git show "$NEW_REF:$path"    > "$MERGE_TMP/ours"
        git show "$OLD_BASE:$path" > "$MERGE_TMP/base"
        git show "main:$path"      > "$MERGE_TMP/theirs"
        if git merge-file -p "$MERGE_TMP/ours" "$MERGE_TMP/base" "$MERGE_TMP/theirs" > "$path"; then
          echo "merged  $path"
        else
          echo "CONFLICT $path"
        fi
      fi
      ;;
    D)
      if git cat-file -e "$NEW_REF:$path" 2>/dev/null && \
         ! git diff --quiet "$OLD_BASE" "$NEW_REF" -- "$path"; then
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
npm run build:bruno-common
npm run build:bruno-converters
npm run build:schema-types
npm run build:bruno-filestore
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
git diff baseline/${NEW_ANCHOR}..main -- packages/ > upgrades/${NEW_ANCHOR}..main.patch

git add upgrade-guide.md upgrades/${NEW_ANCHOR}..main.patch
git commit -m "docs: archive the verified fork delta"

# main 推送须独立确认；普通候选分支和 baseline 使用显式 refspec
git push origin main
git push origin baseline/${NEW_ANCHOR}
```

## 重新锚定

release 分支头与正式 tag 不同，就以旧 baseline 为 base、正式 tag 为新上游、当前 fork 为 theirs，执行上面的完整升级和验证。相同 SHA 才允许直接更新文字说明。

验证并合入 `main` 后，先以独立名称保留旧基准，再将同名 baseline 指向正式 tag，重生成并提交代码 patch。远端 baseline 已存在且需非快进更新时，必须核对远端旧 SHA，并单独确认强推；不能隐式覆盖。

## 回滚方案

`main` 在 ff-merge 之前不被触碰，所以回滚成本按阶段递增：

| 阶段 | 回滚动作 |
| --- | --- |
| 第 2 步之后 | 确认只丢弃本次升级改动后，`git reset --hard <升级前 main>`；再切回 `main` 并删除候选分支 |
| 第 3–5 步 | 原生 merge 尚未提交时用 `git merge --abort`；换树配方用上一行的 reset。切回 `main` 后删除候选分支 |
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

上述记录仅证明旧锚点干跑；不代表当前正式 tag 候选已通过构建或 E2E。

## 正式 v4.2.0 候选验收（2026-10-02）

- 旧基准 `b84eca260`，正式目标 `8efe082a9`；共同祖先与旧基准一致，采用原生三方 merge。
- 冲突只涉及 ExampleItem 的 import 与 watcher 注释；两侧 import 保留。上游已包含 watcher 修复，清退代码定制、保留回归测试。
- 相对正式 tag：37 个代码文件；锁文件无差异，归档 patch 与代码 delta 完全一致。
- 定制回归：前端 14 suites / 138 tests，Electron 2 suites / 4 tests，全部通过；ExampleItem 夹具补齐上游多选状态与真实 DndProvider，不新增测试场景或生产兜底。
- 内部包、JS sandbox 与网页构建通过。requests/converters 类型警告及网页远程图片下载警告仍存在；相关源码与正式上游一致。
- 指定 Electron E2E 范围：201 passed / 5 skipped / 1 failed。跳过项来自上游已有的 `Close All Collections` describe.skip。
- 唯一失败为 `tests/collection/multi-select/multi-select.spec.ts:371`：拖拽后展开 Folder A，定位器匹配两个 folder-chevron；正式 tag 独立源码工作树复跑得到相同错误。未将其计为通过，也未修改上游测试或拖拽行为。
- OpenAPI 同步的转换回归通过；完整 UI 同步流程未人工验收。以上不是全仓库测试或完整产品 E2E 通过声明。
- baseline 与 main 在候选验收期间不轮转；合入并推送 main 须独立确认。

## 硬规则

- **禁止 rebase-diff 式迁移**。将新上游与旧 fork 的反向 diff 直接 apply会在上游改动与 fork 改动同处一段时静默取一侧，从而悄悄回退上游内容。必须用第 3 步的 `git merge-file` 三方合并。
- **三方合并的 base 必须是上一次的锚点树**；原生 merge 仅限共同祖先与旧锚点完全一致时使用。
- **禁止 `-X theirs` / `-X ours` 整块取一侧**。历史上有一次 `-X theirs` 直接把上游在 `openapi-sync.js` 里的 `resolveEnvironmentInheritance` 改动回退了。
- **不碰 `package-lock.json`**。fork 特性不应改动 lock；升级时锁文件取上游新版本，若合并过程把它卷进 fork delta，说明操作有误。
- **绝不 push 到 `upstream`**。全程只 `fetch`。
- **`git read-tree -u --reset` 与 `git checkout <ref> -- .` 会丢弃未提交改动**，执行前确认 `git status --porcelain` 为空。
- **`main` 与受保护分支的 push 必须独立确认**；普通候选分支可直接 push，但必须显式写出目标分支。

## 排除可能性后仍失败时的排查顺序

1. `git diff --name-only baseline/<锚点>..main | grep -i lock` 有输出 → 升级过程卷入了 lock，回退重做
2. 构建报找不到某个 `@usebruno/*` 导出 → 内部包 `dist` 陈旧，按第 5 步重建对应内部包
3. 测试失败但 `git diff` 显示该文件只是上游正规改动 → 说明锚点选错，检查是否误用了 `v4.0.0` / `v4.1.0` 这类不含依赖的旧锚点
