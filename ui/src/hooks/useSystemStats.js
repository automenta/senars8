import { useState, useEffect } from 'react';

const useSystemStats = () => {
  const [stats, setStats] = useState({
    beliefs: 0,
    goals: 0,
    questions: 0,
    tasks: 0,
    cycles: 0,
  });

  useEffect(() => {
    // Placeholder for actual system stats logic
    // In a real scenario, this would connect to the system's stats updates
    const interval = setInterval(() => {
      setStats(prevStats => ({
        ...prevStats,
        beliefs: prevStats.beliefs + Math.floor(Math.random() * 5),
        goals: prevStats.goals + Math.floor(Math.random() * 2),
        questions: prevStats.questions + Math.floor(Math.random() * 3),
        tasks: prevStats.tasks + Math.floor(Math.random() * 1),
        cycles: prevStats.cycles + 1,
      }));
    }, 1000); // Update every second for demonstration

    return () => clearInterval(interval);
  }, []);

  return stats;
};

export default useSystemStats;
