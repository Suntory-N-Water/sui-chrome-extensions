import { Button } from '@sui-chrome-extensions/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { REVIEW_LABELS } from '../constants';
import type { ReviewData } from '../types';

export const reviewColumns: ColumnDef<ReviewData>[] = [
  {
    accessorKey: 'visitDate',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {REVIEW_LABELS.VISIT_DATE}
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className='text-center'>{row.getValue('visitDate')}</div>
    ),
  },
  {
    accessorKey: 'girlName',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {REVIEW_LABELS.SCORE_GIRL}
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className='text-center'>{row.getValue('girlName')}</div>
    ),
  },
  {
    accessorKey: 'totalScore',
    header: ({ column }) => {
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {REVIEW_LABELS.TOTAL_SCORE}
          <ArrowUpDown className='ml-2 h-4 w-4' />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className='text-center font-bold'>{row.getValue('totalScore')}</div>
    ),
  },
  {
    accessorKey: 'title',
    header: REVIEW_LABELS.TITLE,
    cell: ({ row }) => (
      <div className='truncate max-w-50' title={row.getValue('title')}>
        {row.getValue('title')}
      </div>
    ),
  },
  {
    accessorKey: 'body',
    header: REVIEW_LABELS.BODY,
    cell: ({ row }) => {
      const body = row.getValue('body') as string;
      return (
        <div className='text-muted-foreground'>{body.substring(0, 50)}...</div>
      );
    },
  },
];
