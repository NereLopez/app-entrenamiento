import { Component } from '@angular/core';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-calendar-heatmap',
  imports: [],
  templateUrl: './calendar-heatmap.component.html',
  styleUrl: './calendar-heatmap.component.css'
})
export class CalendarHeatmapComponent {
  exportAsImage(event: Event) {
    event.stopPropagation();
    
    const element = document.getElementById('share-area');
  const header = element?.querySelector('.share-only-header');
  const shareBtn = element?.querySelector('.btn-share-icon');

  if (element && header && shareBtn) {
    header.classList.add('show-for-share');
    (shareBtn as HTMLElement).style.display = 'none'; 

    (html2canvas as any)(element, {
      backgroundColor: '#ffffff',
      scale: 3, 
      logging: false,
      useCORS: true
    }).then((canvas: any) => {
      // 2. Volvemos a la normalidad
      header.classList.remove('show-for-share');
      (shareBtn as HTMLElement).style.display = 'flex';

      // 3. Descargamos
      const link = document.createElement('a');
      link.download = `Aroa-Progress-${new Date().toLocaleDateString()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
}
  }


