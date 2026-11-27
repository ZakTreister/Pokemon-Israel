export const richHtmlPrompt = `צור מקטע HTML עבור אתר CardSchool IL לפי ההנחיות הבאות.
החזר HTML בלבד, ללא Markdown, תגיות html/head/body או הסברים.
צור תוכן קריא, נגיש, בעברית ובכיוון RTL, אלא אם התבקש אחרת.

תגיות: p, h2, h3, h4, strong, b, em, i, u, ul, ol, li, blockquote, a, br, hr, span, div, img.
סגור כל תגית שאינה img, br או hr. עד 50,000 תווים.

פריסה והתאמה למסכים:
כברירת מחדל, צור תוכן משותף לכל המסכים. מובייל מתחת ל-768px, דסקטופ מ-768px.
כדי להציב תוכן או תמונות זה לצד זה, השתמש ב-div עם layout-2-col או layout-3-col. כל ילד ישיר הוא עמודה. במובייל העמודות מסתדרות אנכית.
כאשר נדרשת התאמה נקודתית, עטוף רק את התוכן השונה ב-div עם mobile-only או desktop-only. אין צורך ב-media queries.
ניתן להשתמש ב-div עם content-card למסגרת וריפוד או content-highlight להדגשה.
מחלקות align-center, align-left, align-right מותרות ב-div וב-img. יישור טקסט בפסקה, כותרת, ציטוט או פריט רשימה אפשר גם באמצעות style="text-align: center" (או right/left).

תמונות:
אפשר להציב img בכל מקום בתוכן, לרבות בין פסקאות או בתוך עמודות.
השתמש בכתובת HTTPS ישירה המסתיימת ב-jpg, jpeg, png או webp בנתיב הכתובת (פרמטרי query מותרים). אפשר להשתמש בתמונות מהאתר או ממקור חיצוני אמין, עם הרשאת שימוש. אל תמציא URL; בקש כתובת אם אין לך תמונה מתאימה.
הוסף alt משמעותי. class אופציונלי: image-small, image-medium או image-full, ואחת ממחלקות היישור. האתר שומר על יחס הממדים. אין SVG, data URL, Base64 או srcset.
דוגמה: <img src="https://example.com/photo.jpg" alt="תיאור" class="image-medium align-center">

קישורים:
a עם href מסוג HTTP/HTTPS, נתיב מקומי או עוגן מקומי; class="cta-button" אופציונלי לכפתור פעולה.
השתמש רק במחלקות ובמאפיינים שתוארו; ללא JavaScript, style חופשי, תגיות style/script, מאפייני אירועים, iframe או טפסים.
דוגמה לפריסה: <div class="layout-2-col"><div><h2>כותרת</h2><p>תוכן</p></div><img src="https://example.com/photo.jpg" alt="תיאור" class="image-full"></div>

בקשת התוכן:`; 
