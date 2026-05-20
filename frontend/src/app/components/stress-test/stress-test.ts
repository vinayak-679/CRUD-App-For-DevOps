import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  StressService,
  StressTypeStatus,
  StressStatusResponse,
} from '../../services/stress.service';

interface SpikeCard {
  type: 'cpu' | 'memory' | 'disk';
  label: string;
  icon: string;
  description: string;
  status: StressTypeStatus;
  duration: number;
  extraParam: number; // megabytes for memory, sizeMB for disk, unused for CPU
  extraLabel: string;
  extraOptions: { label: string; value: number }[];
}

@Component({
  selector: 'app-stress-test',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './stress-test.html',
  styleUrl: './stress-test.css',
})
export class StressTestComponent implements OnInit, OnDestroy {
  username = '';
  systemInfo = {
    cpuCores: 0,
    totalMemoryMB: 0,
    freeMemoryMB: 0,
    uptime: 0,
    loadAverage: [0, 0, 0],
  };

  cards: SpikeCard[] = [
    {
      type: 'cpu',
      label: 'CPU',
      icon: '⚡',
      description: 'Burns all CPU cores with crypto hash loops',
      status: { state: 'idle' },
      duration: 60,
      extraParam: 0,
      extraLabel: '',
      extraOptions: [],
    },
    {
      type: 'memory',
      label: 'Memory',
      icon: '🧠',
      description: 'Allocates large buffers to consume RAM (t3.small = 2 GB)',
      status: { state: 'idle' },
      duration: 60,
      extraParam: 1024,
      extraLabel: 'Size (MB)',
      extraOptions: [
        { label: '256 MB', value: 256 },
        { label: '512 MB', value: 512 },
        { label: '768 MB', value: 768 },
        { label: '1024 MB (50%+)', value: 1024 },
        { label: '1280 MB (65%+)', value: 1280 },
        { label: '1536 MB (75%+)', value: 1536 },
      ],
    },
    {
      type: 'disk',
      label: 'Disk I/O',
      icon: '💾',
      description: 'Writes large temp files to spike disk I/O, IOPS & usage',
      status: { state: 'idle' },
      duration: 60,
      extraParam: 3072,
      extraLabel: 'File Size (MB)',
      extraOptions: [
        { label: '512 MB', value: 512 },
        { label: '1024 MB', value: 1024 },
        { label: '2048 MB', value: 2048 },
        { label: '3072 MB (50%+ of 8GB)', value: 3072 },
        { label: '4096 MB', value: 4096 },
        { label: '5120 MB', value: 5120 },
      ],
    },
  ];

  durationOptions = [
    { label: '30 sec', value: 30 },
    { label: '60 sec', value: 60 },
    { label: '120 sec', value: 120 },
    { label: '180 sec', value: 180 },
    { label: '300 sec', value: 300 },
  ];

  hasActiveSpike = false;
  statusMessage = '';
  statusType: 'success' | 'error' | 'info' | '' = '';

  private pollInterval: any;

  constructor(
    private stressService: StressService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.username = user?.username || 'User';
    this.refreshStatus();
    // Poll status every 3 seconds
    this.pollInterval = setInterval(() => this.refreshStatus(), 3000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  refreshStatus(): void {
    this.stressService.getStatus().subscribe({
      next: (res: StressStatusResponse) => {
        this.systemInfo = res.system;
        this.hasActiveSpike = false;

        for (const card of this.cards) {
          const typeStatus = res.status[card.type];
          if (typeStatus) {
            card.status = typeStatus;
            if (typeStatus.state === 'running') {
              this.hasActiveSpike = true;
            }
          }
        }
      },
      error: () => {
        // Silent fail on status poll
      },
    });
  }

  triggerSpike(card: SpikeCard): void {
    this.clearMessage();

    const handlers = {
      cpu: () => this.stressService.spikeCpu(card.duration),
      memory: () => this.stressService.spikeMemory(card.duration, card.extraParam),
      disk: () => this.stressService.spikeDisk(card.duration, card.extraParam),
    };

    handlers[card.type]().subscribe({
      next: (res) => {
        this.showMessage(res.message, 'success');
        card.status = { state: 'running', startedAt: new Date().toISOString(), duration: card.duration };
        this.hasActiveSpike = true;
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Failed to start spike';
        this.showMessage(msg, 'error');
      },
    });
  }

  stopSpike(type: string): void {
    this.stressService.stop(type).subscribe({
      next: (res) => {
        this.showMessage(res.message, 'info');
        this.refreshStatus();
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to stop spike', 'error');
      },
    });
  }

  stopAll(): void {
    this.stopSpike('all');
  }

  formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  private showMessage(msg: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = msg;
    this.statusType = type;
    setTimeout(() => this.clearMessage(), 5000);
  }

  private clearMessage(): void {
    this.statusMessage = '';
    this.statusType = '';
  }

  logout(): void {
    this.authService.logout();
  }
}
