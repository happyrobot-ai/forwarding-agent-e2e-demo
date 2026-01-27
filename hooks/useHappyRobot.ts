import { useState, useEffect, useRef, useCallback } from 'react';

interface HappyRobotRun {
  id: string;
  runId: string;
  contextType: string;
  contextId: string;
  name: string;
  description?: string;
  status: string;
  platformUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseHappyRobotOptions {
  contextId?: string;
  contextType?: string;
  pollWhenRunning?: boolean;
  pollInterval?: number;
}

export function useHappyRobot(options: UseHappyRobotOptions = {}) {
  const {
    contextId,
    contextType,
    pollWhenRunning = true,
    pollInterval = 5000,
  } = options;

  const [runs, setRuns] = useState<HappyRobotRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch runs from API
  const fetchRuns = useCallback(async () => {
    const params = new URLSearchParams();
    if (contextId) params.set('context_id', contextId);
    if (contextType) params.set('context_type', contextType);

    const url = `/api/happyrobot/runs${params.toString() ? `?${params}` : ''}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      setRuns(data);
      setIsLoading(false);
    } catch (error) {
      console.error('[useHappyRobot] Failed to fetch runs:', error);
      setIsLoading(false);
    }
  }, [contextId, contextType]);

  // Check status for a single run
  const checkStatus = useCallback(async (run: HappyRobotRun) => {
    if (run.status !== 'RUNNING' && run.status !== 'PENDING') {
      return;
    }

    try {
      const response = await fetch(`/api/happyrobot/status?run_id=${run.runId}`);
      const data = await response.json();

      // If terminal status, refresh all runs
      if (['completed', 'failed', 'canceled'].includes(data.status.toLowerCase())) {
        await fetchRuns();
      }
    } catch (error) {
      console.error('[useHappyRobot] Status check failed:', error);
    }
  }, [fetchRuns]);

  // Poll all active runs
  const pollActive = useCallback(() => {
    const activeRuns = runs.filter(r =>
      r.status === 'RUNNING' || r.status === 'PENDING'
    );
    activeRuns.forEach(checkStatus);
  }, [runs, checkStatus]);

  // Initial fetch
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Set up polling for active runs
  useEffect(() => {
    if (!pollWhenRunning) return;

    const activeRuns = runs.filter(r =>
      r.status === 'RUNNING' || r.status === 'PENDING'
    );

    if (activeRuns.length > 0) {
      // Poll immediately
      pollActive();

      // Then on interval
      pollingRef.current = setInterval(pollActive, pollInterval);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollWhenRunning, pollInterval, runs.length, pollActive]);

  // Trigger a new workflow
  const trigger = async (payload: {
    contextType: string;
    contextId: string;
    name?: string;
    description?: string;
    [key: string]: any;
  }) => {
    try {
      const response = await fetch('/api/happyrobot/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Refresh runs list
      await fetchRuns();

      return result;
    } catch (error) {
      console.error('[useHappyRobot] Trigger failed:', error);
      throw error;
    }
  };

  // Computed stats
  const stats = {
    total: runs.length,
    pending: runs.filter(r => r.status === 'PENDING').length,
    running: runs.filter(r => r.status === 'RUNNING').length,
    completed: runs.filter(r => r.status === 'COMPLETED').length,
    failed: runs.filter(r => r.status === 'FAILED').length,
  };

  return {
    runs,
    isLoading,
    stats,
    trigger,
    refetch: fetchRuns,
    isPolling: pollingRef.current !== null,
  };
}
