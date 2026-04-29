type Level = 'beginner' | 'intermediate' | 'advanced';

export interface PlanSuggestionInput {
  subject: string;
  duration: number;
  level: Level;
}

export interface SuggestedPlanDay {
  day: number;
  title: string;
  tasks: string[];
}

const categoryKeywords: Array<{ category: string; keywords: string[] }> = [
  { category: 'Programming', keywords: ['code', 'javascript', 'python', 'react', 'node', 'sql'] },
  { category: 'Mathematics', keywords: ['math', 'algebra', 'calculus', 'statistics'] },
  { category: 'Science', keywords: ['science', 'physics', 'chemistry', 'biology'] },
  { category: 'Languages', keywords: ['language', 'english', 'spanish', 'french', 'german'] },
  { category: 'Business', keywords: ['business', 'marketing', 'finance', 'sales'] },
  { category: 'Health', keywords: ['health', 'fitness', 'nutrition', 'wellness'] },
  { category: 'Art', keywords: ['art', 'drawing', 'design', 'painting'] },
  { category: 'Music', keywords: ['music', 'guitar', 'piano', 'singing'] },
  { category: 'History', keywords: ['history', 'civilization', 'war', 'culture'] },
];

const levelFocus: Record<Level, string[]> = {
  beginner: [
    'Build the foundation',
    'Practice core concepts',
    'Review simple examples',
    'Create a small exercise',
  ],
  intermediate: [
    'Connect concepts',
    'Solve applied problems',
    'Compare real-world examples',
    'Build a mini project',
  ],
  advanced: [
    'Analyze advanced patterns',
    'Practice edge cases',
    'Design a complete solution',
    'Review and optimize your work',
  ],
};

const inferCategory = (subject: string): string => {
  const normalized = subject.toLowerCase();
  const match = categoryKeywords.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  return match?.category ?? 'Other';
};

export const suggestStudyPlan = ({ subject, duration, level }: PlanSuggestionInput) => {
  const cleanedSubject = subject.trim();
  const focusItems = levelFocus[level];

  const days: SuggestedPlanDay[] = Array.from({ length: duration }, (_, index) => {
    const day = index + 1;
    const focus = focusItems[index % focusItems.length];

    return {
      day,
      title: `Day ${day}: ${focus}`,
      tasks: [
        `${focus} for ${cleanedSubject} at a ${level} level.`,
        `Write notes, complete one hands-on activity, and summarize what you learned.`,
      ],
    };
  });

  const tasks = days.map((day) => ({
    day: day.day,
    title: day.title,
    description: day.tasks.join(' '),
  }));

  return {
    title: `${duration}-Day ${cleanedSubject} Study Plan`,
    description: `A ${level} ${duration}-day study plan for ${cleanedSubject}, generated with daily practice tasks and review checkpoints.`,
    category: inferCategory(cleanedSubject),
    durationDays: duration,
    subject: cleanedSubject,
    level,
    days,
    tasks,
  };
};
