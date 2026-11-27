import { Card } from '../components/ui/Card';
import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import {contentPagesService} from '../services/contentPages';
import type {ContentPage as Page} from '../types/contentPage';
import {PageHero} from '../components/ui/PageHero';
import {MediaGallery} from '../components/media/MediaGallery';
import ContentPageLinks from '../components/content/ContentPageLinks';
import SafeHtml from '../components/content/SafeHtml';
import {requestError} from '../utils/requestError';
export default function ContentPage(){
 const {id=''}=useParams();
 return <ContentPageBody key={id} id={id}/>;
}
function ContentPageBody({id}:{id:string}){
 const [page,setPage]=useState<Page|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;contentPagesService.get(id).then(p=>{if(active)setPage(p)}).catch(e=>{if(active)setError(requestError(e))});return()=>{active=false};},[id]);
 if(error)return <div className="container py-8"><p role="alert">{error}</p></div>;
 if(!page)return null;
 const allStars=!!page.isAllStars;
 const hasMedia=!!page.mediaItems?.length,hasBody=!!(page.bodyHtml?.trim()||page.mobileEnabled&&page.mobileHtml?.trim());
 return <div>
 <PageHero league={allStars?'allStars':'kids'} variant={allStars?'all-stars':'dark'} title={page.title} subtitle={page.subtitle}/>
 {(hasMedia||hasBody)&&<div className="container py-8 space-y-5">
 {hasMedia&&<MediaGallery carousel items={page.mediaItems}/>}
 {hasBody&&<Card variant="public" className="p-5 sm:p-8" role="article" aria-label="תוכן העמוד"><SafeHtml html={page.bodyHtml} mobileHtml={page.mobileHtml} mobileEnabled={page.mobileEnabled}/></Card>}
 </div>}
 <ContentPageLinks target={'/content/'+page.id}/>
 </div>;
}
