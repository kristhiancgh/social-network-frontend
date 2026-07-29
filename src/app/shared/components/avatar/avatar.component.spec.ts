import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  function withName(name: string) {
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return component;
  }

  describe('initials', () => {
    it('takes the first letter of the first and last word', () => {
      expect(withName('John Doe').initials()).toBe('JD');
    });

    it('takes two letters from a single word', () => {
      expect(withName('kris').initials()).toBe('KR');
    });

    it('splits on dots and underscores, as aliases use them', () => {
      expect(withName('maria_garcia').initials()).toBe('MG');
      expect(withName('li.chen').initials()).toBe('LC');
    });

    it('uses the outermost words when there are more than two', () => {
      expect(withName('Ana Maria Lopez Ruiz').initials()).toBe('AR');
    });

    it('falls back to ? rather than crashing on an empty name', () => {
      expect(withName('   ').initials()).toBe('?');
    });
  });

  describe('background', () => {
    it('gives the same name the same colour every time', () => {
      const first = withName('johnny').background();
      const second = withName('johnny').background();
      expect(first).toBe(second);
    });

    it('gives different names different colours', () => {
      const johnny = withName('johnny').background();
      const maria = withName('mary_g').background();
      expect(johnny).not.toBe(maria);
    });

    it('keeps saturation and lightness fixed so white text stays readable', () => {
      expect(withName('anything').background()).toMatch(/^hsl\(\d{1,3}, 52%, 45%\)$/);
    });
  });
});
