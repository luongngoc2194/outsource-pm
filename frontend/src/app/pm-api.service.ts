import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PMDatabaseState {
  projects: any[];
  requests: any[];
  personnel: any[];
  members: any[];
  batches: any[];
  items: any[];
  docs: any[];
  bbnt: any[];
  audit: any[];
}

@Injectable({ providedIn: 'root' })
export class PmApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:3000/api';

  getFullState(): Observable<PMDatabaseState> {
    return this.http.get<PMDatabaseState>(`${this.apiBase}/state`);
  }

  saveProject(payload: any): Observable<{ id: number; db: PMDatabaseState }> {
    return payload.id
      ? this.http.put<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/projects/${payload.id}`, payload)
      : this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/projects`, payload);
  }

  saveRequest(payload: any): Observable<{ id: number; db: PMDatabaseState }> {
    return payload.id
      ? this.http.put<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/requests/${payload.id}`, payload)
      : this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/requests`, payload);
  }

  savePersonnel(payload: any): Observable<{ id: number; db: PMDatabaseState }> {
    return payload.id
      ? this.http.put<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/personnel/${payload.id}`, payload)
      : this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/personnel`, payload);
  }

  togglePersonnelStatus(id: number): Observable<{ id: number; status: string; db: PMDatabaseState }> {
    return this.http.patch<{ id: number; status: string; db: PMDatabaseState }>(`${this.apiBase}/personnel/${id}/toggle`, {});
  }

  assignMember(payload: { reqId: number; persId: number; role: string }): Observable<{ id: number; db: PMDatabaseState }> {
    return this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/members`, payload);
  }

  saveAllocationBatch(payload: { batchId?: number | null; reqId: number; month: string; note: string; rows: any[] }): Observable<{ id: number; db: PMDatabaseState }> {
    return payload.batchId
      ? this.http.put<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/allocations/${payload.batchId}`, payload)
      : this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/allocations`, payload);
  }

  saveDocument(payload: any): Observable<{ id: number; db: PMDatabaseState }> {
    return this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/documents`, payload);
  }

  saveBbnt(payload: any): Observable<{ id: number; db: PMDatabaseState }> {
    return this.http.post<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/acceptance-records`, payload);
  }

  toggleBbntStatus(id: number, send: boolean, sentDate = '2026-11-02'): Observable<{ id: number; db: PMDatabaseState }> {
    return this.http.patch<{ id: number; db: PMDatabaseState }>(`${this.apiBase}/acceptance-records/${id}/status`, { send, sentDate });
  }

  softDelete(coll: string, id: number): Observable<{ label: string; db: PMDatabaseState }> {
    return this.http.delete<{ label: string; db: PMDatabaseState }>(`${this.apiBase}/trash/${coll}/${id}`);
  }

  restore(coll: string, id: number): Observable<{ label: string; db: PMDatabaseState }> {
    return this.http.post<{ label: string; db: PMDatabaseState }>(`${this.apiBase}/trash/${coll}/${id}/restore`, {});
  }

  importExcel(payload: { type: string; dryRun: boolean; rows: any[] }): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/excel/import`, payload);
  }

  getExportUrl(type: string, projectId: number): string {
    return `${this.apiBase}/excel/export/${type}?projectId=${projectId}`;
  }
}
