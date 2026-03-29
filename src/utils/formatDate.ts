import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date: Date | string) =>
  format(new Date(date), 'dd MMM yyyy');

export const timeAgo = (date: Date | string) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });
