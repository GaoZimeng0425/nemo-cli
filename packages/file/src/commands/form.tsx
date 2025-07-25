'use client'
import type { FC } from 'react'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useToggle } from 'react-use'
import { toast } from 'sonner'

import { Form, FormControl, FormField, FormItem, FormMessage } from '@prime-next/design/components/ui/form'
import { Input } from '@prime-next/design/components/ui/input'
import { cn } from '@prime-next/design/lib/utils'
import FormActions from '@/components/common/form/form-actions'
import type { ProjectDataChangeSearchRequestType } from '@/types/data'
import InstitutionSelect from '../../components/institution-select'
import ProjectGroupSelect from '../../components/project-group-select'
import SourceSelect from '../../components/source-select'
import CategorySelect from './category-select'
import ChangeTypeSelect from './change-type-select'

// TODO: 增加可配置搜索表单
const FilterForm: FC<{ onSubmit: (values: ProjectDataChangeSearchRequestType) => void; onReset: () => void }> = ({
  onSubmit,
  onReset,
}) => {
  const { t } = useTranslation()
  const [params, setParams] = useQueryStates({
    source: parseAsInteger,
    changeType: parseAsInteger,
    changeCategory: parseAsInteger,
    projectNo: parseAsString,
    borrowerId: parseAsInteger,
    groupId: parseAsInteger,
  })

  const form = useForm<ProjectDataChangeSearchRequestType>({
    values: params,
  })

  function handleSubmit(values: ProjectDataChangeSearchRequestType) {
    try {
      onSubmit(values)
      setParams(values)
    } catch (error) {
      console.error('Form submission error', error)
      toast.error('Failed to submit the form. Please try again.')
    }
  }
  const handleReset = () => {
    form.reset()
    onReset()
    setParams(null)
  }
  const [isExpanded, setIsExpanded] = useToggle(false)

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn('grid w-full grid-cols-4 items-center justify-start gap-4')}
      >
        <FormField
          control={form.control}
          name="projectNo"
          render={({ field }) => (
            <FormItem>
              {/* <FormLabel className="shrink-0 whitespace-nowrap">{t('NS邮箱')}</FormLabel> */}
              <FormControl>
                <Input {...field} placeholder={t('项目号')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SourceSelect isUpdate {...field} placeholder={t('数据来源')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="changeType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ChangeTypeSelect {...field} placeholder={t('变更类型')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isExpanded && (
          <>
            <FormField
              control={form.control}
              name="changeCategory"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CategorySelect {...field} placeholder={t('变更类目')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ProjectGroupSelect {...field} placeholder={t('关联项目组')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="borrowerId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <InstitutionSelect {...field} placeholder={t('机构名称')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormActions
          className={cn(isExpanded && 'col-span-2')}
          onReset={handleReset}
          onExpand={() => setIsExpanded(!isExpanded)}
          isExpanded={isExpanded}
        />
      </form>
    </Form>
  )
}

export default FilterForm
