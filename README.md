# dryrun
Alicia Teo | [github repo README link](https://github.com/zyliciat/dryrun/blob/main/README.md) | [github pages url](https://zyliciat.github.io/dryrun/)

### Contents
1. [Overview](#1-overview)
2. [Design Process](#2-design-process)
3. [Features](#3-features)
4. [Technologies Used](#4-technologies-used)
5. [Approach & Technical Considerations](#5-approach--technical-considerations)
6. [Testing](#6-testing)
7. [References](#7-references)

## 1: Overview
### Problem Statement
Singapore tends to have quite unpredictable weather and there are many things to look out for: rain, thunder, UV, heat and sometimes even haze. Singapore also has a tendency for two regions to have vastly differing weather conditions. NEA's weather forecast metrics also tend to be distributed across the NEA site and I need to search for them separately, only for a metric to be refreshed and changed.

As I gear up for my half marathon, it causes a lot of uncertainty and impacts my plans quite often as I tend to run in the opposite end of SG from where I live.

### Objective 
I created this website for
1. let's be real - it is for a programming assignment
2. but also wanted to create an website that I myself could use when going for runs, to check weather conditions for the particular area I'm running consolidating the stats that I want to see. 

**Target Audience:** runners or park users in general 

**Theme:** 
Encourage and enable healthy lifestyle by removing barriers to regular exercise and helping to make it easier for people to plan their exercise. As the weather would impact outdoor activity plans such as avoiding outdoor activities when it is rainy season, a heatwave or hazy. 

(Sources: [Straits times: People adjusting their outdoor activities when there is heat](https://www.straitstimes.com/singapore/environment/want-to-be-heat-resilient-short-bouts-of-exercise-outdoors-could-be-more-helpful-than-blasting-the?ref=inline-article), [CNA: adjusting outdoor activities with haze](https://www.youtube.com/watch?v=sJFtb3OONxo))

## 2: Design Process
### User Stories
|User Story|Prioritisation|
|----------|--------------|
|As a runner, I want to see key metrics like UV, weather(rainy/sunny/thunder/lightning), haze, rainfall levels for a park I am interested in | High |
|As a runner, I want to be able to be able to compare between the parks to be able to decide which park I should go to or not | High |
|As a runner, I would like to be able to provide thresholds to customise the park scoring to my own comfort levels | Medium |
| Future-state: As a runner, I would like a way to observe trends to understand how a weather condition is changing in real time | Medium |

### UI Design Process

Figma wireframe design process: https://www.figma.com/design/Tfalmy9SYrz2bxKi7cQABj/dryrun-UI?node-id=0-1&t=K0Jpfpf6H3ypfnee-1

**Key things included in initial UI design**
- colour scheme, typography
- logos or any other components
- overall layout and placement of key components, with place holder for dynamic components first

## 3: Features
1. Upon page load/reload, the site pulls for each park the corresponding latest information for the various metrics and consolidates it to be shown on a card.
2. The cards for each park's weather information is classified based on Good, OK, Not Good or Bad, based on certain thresholds. 
3. On first page load, it is classified based on a default setting. However, the user can choose to change the threshold settings to reflect their comfort level and the classifications will be reflected accordingly. The forecast rules are fixed: they are shown in the same table but cannot be edited.

## 4: Technologies Used

### Technologies Used
- **HTML 5** for webpage structures
- **CSS** for styling
- **JS** for fetching data, classifications and manipulating outputs to be passed back to the html and reflected on the frontend
- **data.gov environment related APIs** for weather real-time related data
- **Figma** for initial UI wireframe design
- **google fonts** for import of the host grotesk font
- **github** for CI/CD and website deployment to github pages

### API End Points Used
Base URL: `https://api-open.data.gov.sg/v2/real-time/api`

| API | Endpoint (GET) | Data used | Matched to park by |
|---|---|---|---|
| Rainfall | `/rainfall` | Latest rainfall reading | Nearest station |
| 2-hour weather forecast | `/two-hr-forecast` | Forecast text, including thunder and rain | Park's area |
| PSI | `/psi` | 24-hour PSI (haze) | Park's region |
| UV index | `/uv` | Latest UV index | Same value for all of Singapore |
| WBGT | `/weather?api=wbgt` | WBGT value and heat stress level | Nearest station |

**NEA Weather API Reading Refresh Frequency** 
- Rainfall: every 5 minutes
- Forecast (next 2 hours): every 30 minutes
- PSI (24h average): every hour
- UV index: every hour, from 7am to 7pm
- WBGT: every 15 minutes

## 5: Approach & Technical Considerations

#### Approach

The app starts from one list of parks, gathers the latest readings for each park, then rates each park on its worst reading.

- **One park list as the starting point:** each park is stored with its area, region and coordinates, because the APIs identify locations differently.
- **One function per API:** each function calls its endpoint once, then goes through the park list to pick each park’s reading:
  - rainfall and WBGT: nearest station, by straight-line distance (Pythagoras theorem)
  - forecast: the park’s area
  - PSI: the park’s region
  - UV: one value for all of Singapore
- **Fetch together, then combine:** all five functions run at once using `Promise.allSettled`, and their results are combined into one record per park. If one API fails, the other readings still show. An error message appears only if all five fail.
- **Worst reading wins:** each park is rated Good, OK, Not Good or Bad according to the worst category any reading reaches, so one serious hazard is not hidden by other good readings.
- **Missing is not Good:** a park with any missing reading is rated OK at best.
- **Some rules are non-negotiable:** drizzle forecast is OK, rain or showers is Not Good, and thundery or heavy is Bad. Users cannot edit these, as thunder should never be set as OK to run in.

#### Technical Considerations

| Category | Decision | Remarks |
|----------|----------|---------|
| API handling | Wait 5 seconds and retry up to 3 times on "too many requests" (429) | Handles rate limits without the user having to reload. Other errors are not retried. |
| Classification | Show what caused the status on each card that is not "Good" | Helps users judge for themselves whether the issue matters to them. |
| User settings | Save custom thresholds in local storage, with a reset button | Settings are kept between visits without needing accounts or a server, but only on that browser. |
| User settings | Only save thresholds that increase from OK to Bad | Prevents settings that would not make sense. |
| Performance | Keep the latest readings in memory | Changing thresholds redraws the cards without calling the APIs again. Reloading the page fetches new readings. |
| Accessibility | Turn off the logo animation for users who prefer reduced motion | Moving elements can be uncomfortable for some users. |
| Accessibility | Give each threshold box its own label | Screen readers can tell the boxes in the table apart. |

## 6: Testing

|Test Case | Resolution |
|----------|------------|
| Weather should show when the page opens | Readings first loaded only after clicking a button. The code now fetches them as soon as the page opens. |
| Weather should still load if the API is busy ("too many requests") | The code waits 5 seconds and tries again, up to 3 times. |
| Cards should only show after all data has arrived (`async`/`await`) | The page shows "Loading..." while `Promise.allSettled` waits for all five API calls, then builds the cards. |
| Errors from API calls should be caught (`try...catch`) | A failed request is logged to the console and its readings are treated as missing. If all five fail, the page shows "Couldn't get the weather. Please try again." |
| A park with a missing reading should not be rated "Good" | The code rates the park "OK" or worse and shows "no reading" on the card. This covers forecast, rainfall, PSI, UV and WBGT. |
| An empty response from an API should not stop the cards from showing | The affected readings are treated as missing instead of causing an error. |
| A park with drizzle forecast should not be rated "Good" | The code rates the park "OK" or worse and shows "drizzle forecast" as the issue when "OK" is its category. |
| User should know why a park is not rated "Good" | Each of these cards has an "Issue" line naming the cause, such as UV or rainfall. |
| Thresholds entered in the wrong order should be rejected | Values must increase from OK to Bad. Otherwise nothing is saved and a message explains why. |
| Custom thresholds should remain after reloading the page | They are saved in the browser's local storage. The reset button removes them and restores the defaults. |
| Page should fit a mobile screen | Open: the cards wrap, but the rest of the layout has not been adjusted for small screens. |

## 7: References
| Reference | Purpose |
|--------|-----|
| [data.gov Environment Related APIs](https://data.gov.sg/datasets?formats=API&topics=environment) | NEA APIs |
| [BEgg Website](https://www.b-egg.farm/) | Interesting website that was used for UI, styling inspiration |

I also have to acknowledge the use of AI to assist with coding, documentation and generation of logos, graphics, park information etc.
