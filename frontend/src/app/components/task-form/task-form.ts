import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskFormComponent implements OnInit {
  task: Partial<Task> = {
    title: '',
    description: '',
    status: 'pending',
  };

  isEditMode = false;
  taskId = '';
  isLoading = false;
  errorMessage = '';
  pageTitle = 'Create Task';

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.taskId = id;
      this.pageTitle = 'Edit Task';
      this.loadTask(id);
    }
  }

  loadTask(id: string): void {
    this.isLoading = true;
    this.taskService.getTask(id).subscribe({
      next: (task) => {
        this.task = {
          title: task.title,
          description: task.description,
          status: task.status,
        };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load task.';
        this.isLoading = false;
      },
    });
  }

  onSubmit(): void {
    if (!this.task.title) {
      this.errorMessage = 'Task title is required.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isEditMode) {
      this.taskService.updateTask(this.taskId, this.task).subscribe({
        next: () => {
          this.router.navigate(['/tasks']);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Failed to update task.';
        },
      });
    } else {
      this.taskService.createTask(this.task).subscribe({
        next: () => {
          this.router.navigate(['/tasks']);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Failed to create task.';
        },
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
