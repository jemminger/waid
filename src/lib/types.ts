export interface Task {
  id: number;
  name: string | null;
  details: string;
  position: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface Bucket {
  label: string;
  tasks: Task[];
}
