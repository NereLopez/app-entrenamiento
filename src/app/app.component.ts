import { Component, inject, effect, signal} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoginComponent } from './auth/login/login.component';
import { TrainingService } from './services/training.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, LoginComponent, RouterModule, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-entrenamiento';
  public trainingService = inject(TrainingService);
  private translate = inject(TranslateService);
  tab: string = 'dashboard';
  darkMode = signal<boolean>(false);
  currentLang = signal<'en' | 'es'>('en');

  constructor() {
    this.translate.addLangs(['en', 'es']);
    this.translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('lang');
    const browserLang = this.translate.getBrowserLang();
    const initialLang: 'en' | 'es' =
      savedLang === 'es' || savedLang === 'en'
        ? savedLang
        : browserLang === 'es'
          ? 'es'
          : 'en';
    this.translate.use(initialLang);
    this.currentLang.set(initialLang);

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      this.darkMode.set(true);
    }

    effect(() => {
      if (this.darkMode()) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
        
      }
    });
  }
 
  toogleDarkMode() {
    const newMode = !this.darkMode();
    this.darkMode.set(newMode);
    // Guardamos el nuevo estado
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  }

  setLanguage(lang: 'en' | 'es') {
    if (this.currentLang() === lang) {
      return;
    }

    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
  }
}
