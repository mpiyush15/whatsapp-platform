'use client';

import { useParams, useSearchParams } from 'next/navigation';
import LiveChatContainer from '@/components/LiveChat/LiveChatContainer';

export default function LiveChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const searchParams = useSearchParams();
  const openPhone = searchParams.get('phone');

  return (
    <div className="h-full bg-gray-50 overflow-hidden">
      <LiveChatContainer initialPhone={openPhone} projectId={projectId} />
    </div>
  );
}
