import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PmApiService, PMDatabaseState } from './pm-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly api = inject(PmApiService);

  readonly screen = signal<'dashboard' | 'projects' | 'personnel' | 'audit' | 'trash'>('projects');
  readonly tab = signal<'pyc' | 'members' | 'alloc' | 'docs' | 'bbnt'>('pyc');
  readonly curProj = signal<number>(1);
  readonly apiConnected = signal<boolean>(false);
  readonly db = signal<PMDatabaseState>({
    projects: [], requests: [], personnel: [], members: [], batches: [], items: [], docs: [], bbnt: [], audit: []
  });

  readonly activeProjects = computed(() => this.db().projects.filter(p => !p.del));
  readonly currentProject = computed(() =>
    this.activeProjects().find(p => p.id === this.curProj()) || this.activeProjects()[0] || { id: 1, code: 'DA-01', name: 'Cổng thông tin khách hàng', customer: 'Viettel / Khối CNTT', status: 'ACTIVE' }
  );

  ngOnInit(): void {
    this.refreshState();
  }

  refreshState(): void {
    this.api.getFullState().subscribe({
      next: (state) => {
        this.db.set(state);
        this.apiConnected.set(true);
      },
      error: () => this.apiConnected.set(false)
    });
  }

  r1(v: number): number {
    return Math.round((Number(v) + Number.EPSILON) * 10) / 10;
  }

  mm(md: number): string {
    return (Number(md) / 22).toFixed(2);
  }

  f1(v: number): string {
    return Number(v).toFixed(1);
  }
}
