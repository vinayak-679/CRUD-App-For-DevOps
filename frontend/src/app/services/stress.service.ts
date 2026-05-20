import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StressResponse {
  message: string;
  type?: string;
  duration?: number;
  cores?: number;
  megabytes?: number;
  sizeMB?: number;
  totalSystemMemMB?: number;
  stopped?: string[];
}

export interface StressTypeStatus {
  state: 'idle' | 'running' | 'error';
  startedAt?: string;
  duration?: number;
  megabytes?: number;
  sizeMB?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  lastRun?: string;
  error?: string;
}

export interface StressStatusResponse {
  status: {
    cpu: StressTypeStatus;
    memory: StressTypeStatus;
    disk: StressTypeStatus;
  };
  system: {
    cpuCores: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
    uptime: number;
    loadAverage: number[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class StressService {
  private apiUrl = `${environment.apiUrl}/stress`;

  constructor(private http: HttpClient) {}

  spikeCpu(duration: number = 60): Observable<StressResponse> {
    return this.http.post<StressResponse>(`${this.apiUrl}/cpu`, { duration });
  }

  spikeMemory(duration: number = 60, megabytes: number = 512): Observable<StressResponse> {
    return this.http.post<StressResponse>(`${this.apiUrl}/memory`, { duration, megabytes });
  }

  spikeDisk(duration: number = 30, sizeMB: number = 1024): Observable<StressResponse> {
    return this.http.post<StressResponse>(`${this.apiUrl}/disk`, { duration, sizeMB });
  }

  stop(type: string = 'all'): Observable<StressResponse> {
    return this.http.post<StressResponse>(`${this.apiUrl}/stop`, { type });
  }

  getStatus(): Observable<StressStatusResponse> {
    return this.http.get<StressStatusResponse>(`${this.apiUrl}/status`);
  }
}
