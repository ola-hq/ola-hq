#!/usr/bin/env python3
"""Public Letterboxd diary RSS -> on-build JSON; recent entries only, never a full-account claim."""
import argparse
from datetime import date,datetime,timezone
import json
from pathlib import Path
import re
from urllib.request import Request,urlopen
import xml.etree.ElementTree as ET

ACCOUNT="ourpolaroidproj"
RSS=f"https://letterboxd.com/{ACCOUNT}/rss/"

def child_text(parent,name):
    for child in parent:
        if child.tag.split("}")[-1].split(":")[-1]==name:
            return (child.text or "").strip()
    return ""

def parse_rss(data):
    root=ET.fromstring(data)
    if root.tag.split("}")[-1]!="rss":
        raise ValueError("Not RSS")
    channel=next((x for x in root if x.tag.split("}")[-1]=="channel"),None)
    if channel is None:
        raise ValueError("Missing channel")
    films=[]
    for item in channel:
        if item.tag.split("}")[-1]!="item":
            continue
        title=child_text(item,"filmTitle")
        rating=child_text(item,"memberRating")
        if not title or not rating:
            continue
        try:
            score=float(rating)
        except ValueError:
            continue
        if not (0.5<=score<=5.0 and score*2==round(score*2)):
            continue
        rawdate=child_text(item,"watchedDate")
        watched=None
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}",rawdate):
            try:
                watched=date.fromisoformat(rawdate).isoformat()
            except ValueError:
                pass
        year=child_text(item,"filmYear")
        url=child_text(item,"link")
        if not url.startswith("https://letterboxd.com/"):
            url=None
        films.append({"title":title,"year":year if re.fullmatch(r"\d{4}",year) else None,
                      "score":score,"watchedDate":watched,"url":url})
    return films

def self_test():
    sample=b'''<rss version="2.0" xmlns:letterboxd="https://letterboxd.com"><channel>
    <item><letterboxd:filmTitle>Film, 2</letterboxd:filmTitle><letterboxd:filmYear>2025</letterboxd:filmYear><letterboxd:memberRating>4.5</letterboxd:memberRating><letterboxd:watchedDate>2026-10-08</letterboxd:watchedDate></item>
    <item><letterboxd:filmTitle>Unrated</letterboxd:filmTitle></item>
    </channel></rss>'''
    records=parse_rss(sample)
    assert len(records)==1 and records[0]["title"]=="Film, 2"
    assert records[0]["score"]==4.5 and records[0]["watchedDate"]=="2026-10-08"
    print("Letterboxd RSS parser self-test passed")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default="data/letterboxd-recent.json")
    parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test:
        self_test()
        return
    document={"account":ACCOUNT,"source":RSS,
              "scope":"recent_public_diary_entries_not_complete_library",
              "checkedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
              "status":"unavailable","entries":[],"totalEntries":0}
    try:
        request=Request(RSS,headers={"User-Agent":"Mozilla/5.0 (compatible; OLAHQ diary display)",
                                    "Accept":"application/rss+xml, application/xml, text/xml"})
        with urlopen(request,timeout=12) as response:
            data=response.read(1_000_001)
        if len(data)>1_000_000:
            raise ValueError("Feed too large")
        films=parse_rss(data)
        document.update(status="ok",entries=films,totalEntries=len(films))
        print("Letterboxd feed provided",len(films),"rated recent entries")
    except Exception as error:
        print("Letterboxd feed unavailable; no fictional data:",type(error).__name__)
    path=Path(args.output)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(document,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Published feed status:",document["status"])

if __name__=="__main__":
    main()
