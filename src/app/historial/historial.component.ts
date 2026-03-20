import { CommonModule, AsyncPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent implements OnInit {
  private firestore = inject(Firestore);
 workouts$!: Observable<any[]>;

  ngOnInit() {
    const workotsRef = collection(this.firestore, 'worksouts');
    this.workouts$ = collectionData(workotsRef, { idField: 'id'}) as Observable<any[]>;
    
  }

}
