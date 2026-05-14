import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  username = '';
  totalTasks = 0;
  pendingTasks = 0;
  inProgressTasks = 0;
  completedTasks = 0;

  constructor(
    private authService: AuthService,
    private taskService: TaskService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.username = user?.username || 'User';

    this.taskService.getTasks().subscribe({
      next: (tasks: Task[]) => {
        this.totalTasks = tasks.length;
        this.pendingTasks = tasks.filter((t) => t.status === 'pending').length;
        this.inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
        this.completedTasks = tasks.filter((t) => t.status === 'completed').length;
      },
      error: () => {
        // Auth interceptor handles 401
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
