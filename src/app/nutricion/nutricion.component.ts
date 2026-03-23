import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NutricionService } from '../services/nutricion.service';


@Component({
  selector: 'app-nutricion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nutricion.component.html',
  styleUrl: './nutricion.component.css'
})
export class NutricionComponent {
  public nutricionServices = inject(NutricionService);

  updatePeso(event: any) {
    const value = Number(event.target.value);
    this.nutricionServices.peso.set(value);
}
}