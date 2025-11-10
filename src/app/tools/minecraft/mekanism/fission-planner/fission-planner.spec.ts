import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FissionPlanner } from './fission-planner';

describe('FissionPlanner', () => {
  let component: FissionPlanner;
  let fixture: ComponentFixture<FissionPlanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FissionPlanner],
    }).compileComponents();

    fixture = TestBed.createComponent(FissionPlanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates a default plan without errors', () => {
    expect(component.error()).toBeNull();
    const result = component.result();
    expect(result).toBeTruthy();
    expect(result?.turbines.count).toBeGreaterThan(0);
  });

  it('switches to sodium cooling automatically enabling the boiler', () => {
    component.toggleCooling('sodium');
    fixture.detectChanges();
    const result = component.result();
    expect(component.form.value.includeBoiler).toBeTrue();
    expect(result?.boiler?.count).toBeGreaterThan(0);
  });
});
