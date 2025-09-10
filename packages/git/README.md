# `@nemo-cli/git`

> @nemo-cli/git Make pnpm Workspace Operation Easier

## Install
```
$ pnpm add @nemo-cli/git --global
```

## Usage

```bash
# help
ng -h
# 子命令 help, 如: ng branch -h
ng <command> -h

# commit
ng commit

# git pull
ng pl
ng pull

# git push
ng ps
ng push

# git checkout, 执行自动 stash, 切换完毕 stash pop
ng co
ng checkout

# checkout new branch
# 如果只填写数字, 自动生成 feature/PRIME- , 如: 输入框输入 1500, 创建分支名为 feature/PRIME-1500
ng co -b

# 删除本地分支
ng branch delete
# 删除远程分支
ng branch delete -r

# 清理本地已合并分支
ng branch clean
```
