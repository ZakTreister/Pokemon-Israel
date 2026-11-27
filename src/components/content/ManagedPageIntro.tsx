import { useEffect, useState } from 'react';
import { PageHero } from '../ui/PageHero';
import { Card } from '../ui/Card';
import SafeHtml from './SafeHtml';
import { staticPageTextsService, type StaticPageText, type StaticPageTextKey } from '../../services/staticPageTexts';
import { requestError } from '../../utils/requestError';

export default function ManagedPageIntro({ pageId }: { pageId: StaticPageTextKey }) {
  return <PageIntro key={pageId} pageId={pageId}/>;
}

function PageIntro({ pageId }: { pageId: StaticPageTextKey }) {
  const [content, setContent] = useState<StaticPageText | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    staticPageTextsService.get(pageId).then(value => {
      if (active) setContent(value);
    }).catch(e => { if (active) setError(requestError(e)); });
    return () => { active = false; };
  }, [pageId]);

  if (error) return <div className="container pt-8"><p role="alert" className="text-destructive">לא ניתן לטעון את טקסטי העמוד: {error}</p></div>;
  if (!content?.title) return null;
  const allStars = pageId === 'all-stars';
  const highlightWord = !allStars && content.title.split('הישראלית').length === 2 ? 'הישראלית' : undefined;
  return <>
    <PageHero league={allStars?'allStars':'kids'} variant={allStars ? 'all-stars' : 'dark'} title={content.title} subtitle={content.subtitle} highlightWord={highlightWord}/>
    {(content.bodyHtml?.trim()||content.mobileEnabled&&content.mobileHtml?.trim()) && <div className="container pt-8">
      <Card variant="public" className="p-5 sm:p-6"><SafeHtml html={content.bodyHtml} mobileHtml={content.mobileHtml} mobileEnabled={content.mobileEnabled}/></Card>
    </div>}
  </>;
}
