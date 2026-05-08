export interface TopicCatalogEntry {
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  subpatterns: string[];
  companies: string[];
}

export interface CompanyTopicSignal {
  topic: string;
  weight: number;
  depthTarget?: number;
}

export interface CompanyPrepSignal {
  label: string;
  detail: string;
}

export interface CompanyProfile {
  logo: string;
  topics: CompanyTopicSignal[];
  prepSignals: CompanyPrepSignal[];
  researchBasis: string;
}

export const COMPANY_TOPICS: Record<string, CompanyProfile> = {
  Google: {
    logo: 'G',
    researchBasis: 'Google software roles consistently emphasize data structures, algorithms, testing, and scalable systems.',
    topics: [
      { topic: 'Dynamic Programming', weight: 1.18, depthTarget: 10 },
      { topic: 'Graph', weight: 1.16, depthTarget: 10 },
      { topic: 'Tree', weight: 1.02, depthTarget: 9 },
      { topic: 'Binary Search', weight: 0.94, depthTarget: 8 },
      { topic: 'Hash Table', weight: 0.88, depthTarget: 8 },
      { topic: 'Array', weight: 0.84, depthTarget: 8 },
      { topic: 'String', weight: 0.78, depthTarget: 8 },
      { topic: 'Sorting', weight: 0.55, depthTarget: 6 },
    ],
    prepSignals: [
      {
        label: 'Scalable design',
        detail: 'Practice explaining tradeoffs for large-scale, reliable systems after the coding screen.',
      },
      {
        label: 'Testing clarity',
        detail: 'Walk through edge cases, failure modes, and validation instead of stopping at a passing solution.',
      },
    ],
  },
  Meta: {
    logo: 'M',
    researchBasis: 'Meta SWE loops emphasize fast coding execution, technical depth, and product/system judgment.',
    topics: [
      { topic: 'Array', weight: 1.14, depthTarget: 9 },
      { topic: 'String', weight: 1.1, depthTarget: 9 },
      { topic: 'Hash Table', weight: 1.08, depthTarget: 9 },
      { topic: 'Tree', weight: 0.98, depthTarget: 8 },
      { topic: 'Graph', weight: 0.92, depthTarget: 8 },
      { topic: 'Dynamic Programming', weight: 0.78, depthTarget: 7 },
      { topic: 'Linked List', weight: 0.72, depthTarget: 7 },
      { topic: 'Recursion', weight: 0.58, depthTarget: 6 },
    ],
    prepSignals: [
      {
        label: 'Product thinking',
        detail: 'Prepare to connect engineering choices to user impact and product constraints.',
      },
      {
        label: 'Fast communication',
        detail: 'Practice clean verbal reasoning under time pressure, especially for coding rounds.',
      },
    ],
  },
  Amazon: {
    logo: 'A',
    researchBasis: 'Amazon SDE prep calls out technical topics, system design, maintainable code, and leadership principles.',
    topics: [
      { topic: 'Array', weight: 1.06, depthTarget: 9 },
      { topic: 'Hash Table', weight: 1.02, depthTarget: 9 },
      { topic: 'Tree', weight: 0.98, depthTarget: 8 },
      { topic: 'Graph', weight: 0.92, depthTarget: 8 },
      { topic: 'Dynamic Programming', weight: 0.84, depthTarget: 7 },
      { topic: 'Queue', weight: 0.74, depthTarget: 6 },
      { topic: 'Sorting', weight: 0.66, depthTarget: 6 },
      { topic: 'String', weight: 0.62, depthTarget: 7 },
      { topic: 'Binary Search', weight: 0.58, depthTarget: 6 },
    ],
    prepSignals: [
      {
        label: 'Leadership principles',
        detail: 'Map project stories to ownership, customer obsession, and tradeoff-heavy decisions.',
      },
      {
        label: 'Maintainable code',
        detail: 'Write testable, readable solutions and call out complexity and edge cases explicitly.',
      },
    ],
  },
  Microsoft: {
    logo: 'MS',
    researchBasis: 'Microsoft interview guidance highlights problem solving, coding, testing, algorithms, data structures, design, and distributed systems.',
    topics: [
      { topic: 'Tree', weight: 1.02, depthTarget: 9 },
      { topic: 'Array', weight: 1, depthTarget: 9 },
      { topic: 'String', weight: 0.98, depthTarget: 8 },
      { topic: 'Linked List', weight: 0.94, depthTarget: 8 },
      { topic: 'Graph', weight: 0.9, depthTarget: 8 },
      { topic: 'Hash Table', weight: 0.86, depthTarget: 8 },
      { topic: 'Recursion', weight: 0.76, depthTarget: 7 },
      { topic: 'Sorting', weight: 0.72, depthTarget: 7 },
      { topic: 'Dynamic Programming', weight: 0.66, depthTarget: 7 },
      { topic: 'Binary Search', weight: 0.64, depthTarget: 6 },
    ],
    prepSignals: [
      {
        label: 'Design breadth',
        detail: 'Expect follow-ups around system design, distributed systems, networking, or product architecture.',
      },
      {
        label: 'Testing discipline',
        detail: 'Show how you verify correctness, handle failures, and keep implementation quality high.',
      },
    ],
  },
  'JPMorgan Chase': {
    logo: 'JPMC',
    researchBasis: 'JPMorgan Chase software roles emphasize coding assessments, data structures, algorithms, databases, SDLC, resiliency, security, and business-facing delivery.',
    topics: [
      { topic: 'Array', weight: 1.05, depthTarget: 8 },
      { topic: 'Hash Table', weight: 1.02, depthTarget: 8 },
      { topic: 'String', weight: 0.96, depthTarget: 8 },
      { topic: 'Tree', weight: 0.9, depthTarget: 7 },
      { topic: 'Binary Search', weight: 0.86, depthTarget: 7 },
      { topic: 'Graph', weight: 0.82, depthTarget: 7 },
      { topic: 'Dynamic Programming', weight: 0.74, depthTarget: 7 },
      { topic: 'Sorting', weight: 0.7, depthTarget: 6 },
      { topic: 'Queue', weight: 0.56, depthTarget: 5 },
    ],
    prepSignals: [
      {
        label: 'Finance domain',
        detail: 'Prepare to discuss reliability, risk, payments, trading, or customer-impact tradeoffs.',
      },
      {
        label: 'SDLC quality',
        detail: 'Show clean implementation, testing, resiliency, security awareness, and stakeholder communication.',
      },
    ],
  },
  Deloitte: {
    logo: 'D',
    researchBasis: 'Deloitte technology roles emphasize software engineering, cloud, front-end/back-end delivery, system architecture, analytics, and consulting-style problem solving.',
    topics: [
      { topic: 'Array', weight: 0.92, depthTarget: 7 },
      { topic: 'String', weight: 0.9, depthTarget: 7 },
      { topic: 'Hash Table', weight: 0.86, depthTarget: 7 },
      { topic: 'Sorting', weight: 0.78, depthTarget: 6 },
      { topic: 'Tree', weight: 0.72, depthTarget: 6 },
      { topic: 'Graph', weight: 0.68, depthTarget: 6 },
      { topic: 'Dynamic Programming', weight: 0.58, depthTarget: 5 },
      { topic: 'Recursion', weight: 0.52, depthTarget: 5 },
    ],
    prepSignals: [
      {
        label: 'Case thinking',
        detail: 'Practice structured problem framing, assumptions, tradeoffs, and clear client-ready reasoning.',
      },
      {
        label: 'Cloud delivery',
        detail: 'Be ready to connect code choices to architecture, implementation, data, and business outcomes.',
      },
    ],
  },
  'Goldman Sachs': {
    logo: 'GS',
    researchBasis: 'Goldman Sachs engineering guidance emphasizes HackerRank-style assessments, algorithms, distributed systems, databases, scalable software, and financial systems.',
    topics: [
      { topic: 'Array', weight: 1.04, depthTarget: 8 },
      { topic: 'Dynamic Programming', weight: 1, depthTarget: 8 },
      { topic: 'Binary Search', weight: 0.98, depthTarget: 8 },
      { topic: 'Hash Table', weight: 0.94, depthTarget: 8 },
      { topic: 'Graph', weight: 0.88, depthTarget: 7 },
      { topic: 'Tree', weight: 0.86, depthTarget: 7 },
      { topic: 'Sorting', weight: 0.82, depthTarget: 7 },
      { topic: 'String', weight: 0.74, depthTarget: 7 },
      { topic: 'Queue', weight: 0.52, depthTarget: 5 },
    ],
    prepSignals: [
      {
        label: 'Timed coding',
        detail: 'Practice fast, correct HackerRank-style implementation with careful edge-case handling.',
      },
      {
        label: 'Finance systems',
        detail: 'Prepare examples around scalable systems, data, low-latency thinking, and robust engineering.',
      },
    ],
  },
};

export const TOPIC_SUBPATTERNS: Record<string, string[]> = {
  'Dynamic Programming': ['1D state transitions', 'knapsack style choices', 'grid DP', 'subsequence DP', 'interval DP'],
  Graph: ['BFS shortest paths', 'DFS traversal', 'topological ordering', 'union-find connectivity', 'weighted path reasoning'],
  Tree: ['tree DFS', 'lowest common ancestor', 'tree DP', 'BST invariants', 'path aggregation'],
  Array: ['two pointers', 'prefix sums', 'greedy scans', 'sorting with invariants', 'hashing for complements'],
  String: ['sliding window', 'frequency maps', 'palindrome expansion', 'state machine parsing', 'prefix-function style matching'],
  'Binary Search': ['answer search', 'boundary search', 'rotated arrays', 'search on monotonic functions'],
  'Hash Table': ['complement lookup', 'frequency counting', 'grouping', 'prefix hash tricks'],
  'Linked List': ['pointer rewiring', 'fast slow pointers', 'cycle detection', 'k-group manipulation'],
  Queue: ['monotonic queue', 'level-order batching', 'window scheduling'],
  Backtracking: ['decision trees', 'pruning', 'state restoration', 'subset generation'],
  Sorting: ['custom comparator logic', 'bucket ordering', 'interval merging'],
  Recursion: ['divide and conquer', 'post-order state returns', 'recursive decomposition'],
  'Depth-First Search': ['recursive traversal', 'backtracking state', 'component traversal'],
  'Breadth-First Search': ['multi-source BFS', 'level expansion', 'queue state modelling'],
};

export const PROBLEM_CATALOG: TopicCatalogEntry[] = [
  {
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    difficulty: 'Easy',
    topic: 'Dynamic Programming',
    subpatterns: ['1D state transitions'],
    companies: ['Google', 'Amazon', 'Microsoft', 'JPMorgan Chase', 'Deloitte'],
  },
  {
    title: 'House Robber',
    slug: 'house-robber',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['1D state transitions', 'knapsack style choices'],
    companies: ['Meta', 'Amazon', 'Microsoft', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Coin Change',
    slug: 'coin-change',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['knapsack style choices'],
    companies: ['Google', 'Meta', 'Amazon', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Longest Increasing Subsequence',
    slug: 'longest-increasing-subsequence',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['subsequence DP', 'binary search'],
    companies: ['Google', 'Meta', 'Microsoft', 'Goldman Sachs'],
  },
  {
    title: 'Edit Distance',
    slug: 'edit-distance',
    difficulty: 'Hard',
    topic: 'Dynamic Programming',
    subpatterns: ['grid DP', 'subsequence DP'],
    companies: ['Google', 'Meta', 'Goldman Sachs'],
  },
  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['DFS traversal', 'component traversal'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'JPMorgan Chase', 'Deloitte'],
  },
  {
    title: 'Course Schedule',
    slug: 'course-schedule',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['topological ordering'],
    companies: ['Google', 'Meta', 'Amazon', 'Deloitte', 'Goldman Sachs'],
  },
  {
    title: 'Clone Graph',
    slug: 'clone-graph',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['BFS shortest paths', 'DFS traversal'],
    companies: ['Meta', 'Amazon', 'JPMorgan Chase'],
  },
  {
    title: 'Network Delay Time',
    slug: 'network-delay-time',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['weighted path reasoning'],
    companies: ['Google', 'Microsoft', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Redundant Connection',
    slug: 'redundant-connection',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['union-find connectivity'],
    companies: ['Amazon', 'Google', 'Goldman Sachs'],
  },
  {
    title: 'Binary Tree Level Order Traversal',
    slug: 'binary-tree-level-order-traversal',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['level-order batching'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'JPMorgan Chase', 'Deloitte'],
  },
  {
    title: 'Validate Binary Search Tree',
    slug: 'validate-binary-search-tree',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['BST invariants'],
    companies: ['Google', 'Meta', 'JPMorgan Chase'],
  },
  {
    title: 'Lowest Common Ancestor of a Binary Tree',
    slug: 'lowest-common-ancestor-of-a-binary-tree',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['lowest common ancestor', 'tree DFS'],
    companies: ['Meta', 'Amazon', 'Microsoft', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Binary Tree Maximum Path Sum',
    slug: 'binary-tree-maximum-path-sum',
    difficulty: 'Hard',
    topic: 'Tree',
    subpatterns: ['tree DP', 'path aggregation'],
    companies: ['Google', 'Meta', 'Goldman Sachs'],
  },
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topic: 'Array',
    subpatterns: ['hashing for complements'],
    companies: ['Amazon', 'Meta', 'Microsoft', 'JPMorgan Chase', 'Deloitte', 'Goldman Sachs'],
  },
  {
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    difficulty: 'Medium',
    topic: 'Array',
    subpatterns: ['prefix sums'],
    companies: ['Meta', 'Amazon', 'JPMorgan Chase', 'Deloitte'],
  },
  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    topic: 'Array',
    subpatterns: ['two pointers'],
    companies: ['Google', 'Meta', 'Amazon', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Sliding Window Maximum',
    slug: 'sliding-window-maximum',
    difficulty: 'Hard',
    topic: 'Queue',
    subpatterns: ['monotonic queue', 'window scheduling'],
    companies: ['Google', 'Amazon', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'Medium',
    topic: 'String',
    subpatterns: ['sliding window', 'frequency maps'],
    companies: ['Amazon', 'Meta', 'Google', 'JPMorgan Chase', 'Deloitte'],
  },
  {
    title: 'Group Anagrams',
    slug: 'group-anagrams',
    difficulty: 'Medium',
    topic: 'Hash Table',
    subpatterns: ['grouping', 'frequency counting'],
    companies: ['Meta', 'Amazon', 'JPMorgan Chase', 'Deloitte', 'Goldman Sachs'],
  },
  {
    title: 'Minimum Window Substring',
    slug: 'minimum-window-substring',
    difficulty: 'Hard',
    topic: 'String',
    subpatterns: ['sliding window', 'frequency maps'],
    companies: ['Meta', 'Google', 'Deloitte'],
  },
  {
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    difficulty: 'Medium',
    topic: 'Binary Search',
    subpatterns: ['rotated arrays', 'boundary search'],
    companies: ['Amazon', 'Microsoft', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Koko Eating Bananas',
    slug: 'koko-eating-bananas',
    difficulty: 'Medium',
    topic: 'Binary Search',
    subpatterns: ['answer search'],
    companies: ['Google', 'Amazon', 'Goldman Sachs'],
  },
  {
    title: 'Merge k Sorted Lists',
    slug: 'merge-k-sorted-lists',
    difficulty: 'Hard',
    topic: 'Linked List',
    subpatterns: ['pointer rewiring', 'divide and conquer'],
    companies: ['Google', 'Meta', 'Amazon', 'JPMorgan Chase', 'Goldman Sachs'],
  },
  {
    title: 'Reverse Nodes in k-Group',
    slug: 'reverse-nodes-in-k-group',
    difficulty: 'Hard',
    topic: 'Linked List',
    subpatterns: ['k-group manipulation', 'pointer rewiring'],
    companies: ['Meta', 'Microsoft', 'JPMorgan Chase'],
  },
  {
    title: 'Subsets',
    slug: 'subsets',
    difficulty: 'Medium',
    topic: 'Backtracking',
    subpatterns: ['decision trees', 'subset generation'],
    companies: ['Amazon', 'Meta', 'Deloitte', 'Goldman Sachs'],
  },
  {
    title: 'Word Search',
    slug: 'word-search',
    difficulty: 'Medium',
    topic: 'Backtracking',
    subpatterns: ['state restoration', 'pruning'],
    companies: ['Amazon', 'Microsoft', 'Deloitte'],
  },
];

export function getTopicFamily(topic: string): string {
  if (topic === 'Depth-First Search' || topic === 'Breadth-First Search') return 'Graph';
  return topic;
}
