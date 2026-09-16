// src/utils/foliaFork.ts
// Fork-only feature flags. 本 fork 关闭上游的 Lattice（队列拼贴）：不显示顶部/队列的拼贴入口、
// 首启不询问播放落点、播放一律进标准播放器、命令面板不提供打开拼贴的命令、设置里不出现相关项。
// 集中成常量，便于上游同步时一眼保留（各入口以 LATTICE_ENABLED 门控，而非删除上游代码）。

export const LATTICE_ENABLED = false;
