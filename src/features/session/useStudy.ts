import { useNavigate } from 'react-router-dom';
import { toast } from '../../ui';
import { getRoom, room } from './sessionStore';

/**
 * Opens the room ready to study something: subject, task text and (optionally) the planner
 * task it counts toward. A session already in progress is never switched underneath you.
 */
export function useStudy() {
  const navigate = useNavigate();
  return (ctx: { subjectId: string | null; task: string; taskId: string | null }) => {
    if (getRoom().timer.status !== 'idle') {
      toast('A session is already running. Finish it before switching.');
    } else {
      room.setContext(ctx);
    }
    navigate('/room');
  };
}
