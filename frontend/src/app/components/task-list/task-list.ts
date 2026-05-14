import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css',
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  isLoading = true;
  deleteMessage = '';

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  deleteTask(id: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.deleteMessage = 'Task deleted successfully.';
          this.loadTasks();
          setTimeout(() => (this.deleteMessage = ''), 3001);
        },
        error: () => {
          this.deleteMessage = 'Failed to delete task.';
          setTimeout(() => (this.deleteMessage = ''), 3001);
        },
      });
    }
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  logout(): void {
    this.authService.logout();
  }
}
