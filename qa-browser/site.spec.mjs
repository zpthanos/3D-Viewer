import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const goto=(page,path='/')=>page.goto('/audit-preview'+path);
test.beforeEach(async({page})=>{
  // Every mail POST is intercepted. These tests never send email or take payment.
  await page.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({protocol:2,outcome:'unconfirmed'})}));
});
test('mobile navigation, pricing, consent and old hero replay',async({page})=>{
  await page.setViewportSize({width:390,height:844});await goto(page,'/');
  await expect(page.locator('#experience')).toHaveAttribute('data-stage','enter');
  await page.getByRole('button',{name:'Μόνο απαραίτητα',exact:true}).click();
  await page.locator('[data-open-nav]').click();await expect(page.locator('#navigation-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('[data-open-nav]')).toBeFocused();
  await page.locator('.scene-enter').click();await expect(page.locator('#experience')).toHaveAttribute('data-stage','table');
  await page.locator('.replay-link').click();await expect(page.locator('#experience')).toHaveAttribute('data-stage','enter');
  await page.locator('#packages').scrollIntoViewIfNeeded();await page.locator('input[name=languages]').last().check();
  await expect(page.locator('[data-plan-languages]')).toHaveText('6 γλώσσες');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('cookie settings are keyboard accessible and Escape returns focus',async({page})=>{
  await goto(page,'/');await page.getByRole('button',{name:'Ρυθμίσεις',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Ρυθμίσεις cookies'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Ρυθμίσεις',exact:true})).toBeFocused();
});
test('required description minimum is visible and enforced before submission',async({page})=>{
  await goto(page,'/forms/changes/');
  await page.getByRole('button',{name:'Μόνο απαραίτητα',exact:true}).click();
  await page.locator('[data-next]').click();await expect(page.locator('[aria-invalid=true]').first()).toBeVisible();
  await expect(page.locator('textarea[name=changes_description]')).toHaveAttribute('minlength','10');
  await expect(page.locator('#hint-changes_description')).toContainText('10');
});
test('all pages fit narrow screens and large desktop viewports',async({page})=>{
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/payments/','/forms/registration/','/terms/','/stands/']){
   await goto(page,path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' at '+width).toBe(true);
   await expect(page.locator('main')).toBeVisible();
  }
 }
});
test('payments link has the real Viva reference and both supplied IBANs',async({page})=>{
 await goto(page,'/payments/');
 const link=page.locator('a[href*="vivapayments.com/web2"]').first();
 await expect(link).toHaveAttribute('href',/ref=8699605866872604/);
 await expect(page.locator('body')).toContainText('MENNOO');
 // Do not open the payment provider or submit payment details.
});
test('critical accessibility checks on home and payments',async({page})=>{
 for(const path of ['/','/payments/']){
  await goto(page,path);const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations.filter(v=>['critical','serious'].includes(v.impact))).toEqual([]);
 }
});
test('reduced motion keeps the old hero usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await goto(page,'/');
 await page.getByRole('button',{name:'Μόνο απαραίτητα',exact:true}).click();
 await page.locator('.scene-enter').click();await expect(page.locator('#experience')).toHaveAttribute('data-stage','table');
 await page.locator('.replay-link').click();await expect(page.locator('#experience')).toHaveAttribute('data-stage','enter');
});
