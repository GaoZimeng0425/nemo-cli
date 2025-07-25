import type { ColumnProps } from '@arco-design/web-react/es/Table/interface'

import { DotBadge } from '@prime-next/design/components/common/status-badge'
import { isEmpty } from '@prime-next/public/utils/typed'
import { createColumn } from '@/components/common/column/createColumn'
import BaseBadge from '@/components/common/tags-badge/base'
import { BASE_EMPTY_TEXT, CHANGE_CATEGORY_MAP, CHANGE_TYPE_MAP, SPLIT_TEXT } from '@/constants'
import type { ProjectDataChangeItemResponseType } from '@/types/data'

export const baseColumn: ColumnProps<ProjectDataChangeItemResponseType>[] = [
  createColumn('time', {
    title: '时间',
    dataIndex: 'createdTime',
    width: 180,
  }),
  createColumn('projectNo', { width: 180 }),
  createColumn('source', {
    title: '数据源',
  }),
  {
    title: '变更类型',
    dataIndex: 'changeType',
    width: 120,
    render: (changeType: number) => (
      <DotBadge size="xs" className="whitespace-nowrap" variant={changeType === 1 ? 'success' : 'danger'}>
        {CHANGE_TYPE_MAP[changeType] ?? BASE_EMPTY_TEXT}
      </DotBadge>
    ),
  },
  {
    title: '变更类目',
    dataIndex: 'changeCategory',
    width: 80,
    render: (changeCategory: number) => {
      if (isEmpty(changeCategory)) return BASE_EMPTY_TEXT
      return (
        <BaseBadge variant={changeCategory} size="xs">
          {CHANGE_CATEGORY_MAP[changeCategory]}
        </BaseBadge>
      )
    },
  },
  createColumn('textArea', {
    title: '变更详情',
    dataIndex: 'changeDetails',
  }),
  {
    title: '关联项目组',
    dataIndex: 'projectGroupNames',
    width: 100,
    render: (projectGroupNames: string[]) => projectGroupNames?.join(SPLIT_TEXT) || BASE_EMPTY_TEXT,
  },
  {
    title: '机构名称',
    width: 100,
    dataIndex: 'borrowerOrgName',
  },
]
