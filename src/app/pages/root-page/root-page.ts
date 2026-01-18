import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpResponse, } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../../app.config';

@Component({
  selector: 'app-root-page',
  imports: [ReactiveFormsModule],
  templateUrl: './root-page.ng.html',
  styleUrl: './root-page.scss',
})
export class RootPage {
  private readonly _httpClient = inject(HttpClient);

  protected readonly registerForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  });

  protected readonly loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  });

  protected async onRegister(): Promise<void> {
    try {
      RootPage.showObject(await firstValueFrom(this._httpClient.post(`${API}/register`, this.registerForm.value)));
    } catch (err) {
      RootPage.showError(err);
    }
  }

  protected async onLogin(): Promise<void> {
    try {
      RootPage.showObject(await firstValueFrom(this._httpClient.post(`${API}/login`, this.loginForm.value)));
    } catch (err) {
      RootPage.showError(err);
    }
  }

  protected async onLogout(): Promise<void> {
    try {
      RootPage.showResponse(await firstValueFrom(this._httpClient.post(`${API}/logout`, null, {
        observe: 'response'
      })));
    } catch (err) {
      RootPage.showError(err);
    }
  }

  private static showObject(obj: Object): void {
    window.alert(JSON.stringify(obj, null, 2));
  }

  private static showError(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      RootPage.showObject(err.error ?? err.statusText);
    }
    throw err;
  }

  private static showResponse(res: HttpResponse<Object>): void {
    RootPage.showObject(res.body ?? res.statusText);
  }
}
