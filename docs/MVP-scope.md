# MVP Scope - NoelIQ

## Overview

The MVP (Minimum Viable Product) for NoelIQ focuses on the core value proposition: enabling store staff to ask questions about products and get instant, reliable answers.

## MVP Deliverables

### Priority 1: End-to-End Flow (Week 1-2)
- ✅ End-to-end flow for 1 SKU manually loaded from XML (parse → embed → index → ask → answer)
- ✅ Basic frontend Ask Panel with chat-style Q&A
- ✅ Backend /ask route calling retrieval + generation
- ✅ Basic answer display

### Priority 2: Core Features (Week 2-3)
- ✅ Stock block and attachment suggestions in answer card (can be mocked initially)
- ✅ Basic admin dashboard: upload XML, show parsed SKUs, show sync status
- ✅ Incremental update pipeline: detect changed SKUs and re-embed only those

### Priority 3: Polish (Week 3-4)
- Error handling and graceful fallbacks
- Basic logging and analytics
- UI improvements based on initial feedback

## Success Criteria

### Functional Requirements
1. **Rep can ask questions**: In a live pilot store, a rep can ask NoelIQ about a real product SKU and immediately get:
   - Clear selling points in normal English
   - Attach suggestions
   - Stock or alternative if OOS

2. **Safety**: 
   - NoelIQ never leaks cost/margin
   - NoelIQ never invents specs

3. **Admin capability**:
   - Admin can update catalogue XML and re-sync without engineering intervention

### Technical Requirements
- Response time < 3 seconds for typical questions
- Handles at least 10 concurrent users
- 99% uptime during store hours (with graceful degradation)

## Out of Scope (Post-MVP)

- Barcode scanner integration (can be added later)
- SSO integration (using simple tokens for MVP)
- Real-time stock integration (using mock data initially)
- Customer-facing kiosk mode
- Advanced analytics dashboard
- Multi-language support
- Voice input/output

## Testing Strategy

### Pilot Store Selection
- Select 1-2 stores with engaged staff
- High traffic product categories (TVs, laptops)
- Staff training session before launch

### Success Metrics
- Questions answered per day
- % of questions generating "Let me check" (indicates gaps)
- Attach suggestion acceptance rate
- Staff satisfaction score

## Risk Mitigation

### High Risk Areas
1. **Azure OpenAI availability/cost**: Monitor usage, set alerts
2. **Vector search accuracy**: Test with diverse questions
3. **XML format changes**: Flexible parser, clear error messages

### Fallback Plans
- If Azure OpenAI is down: Return cached answers or "Let me check"
- If vector search fails: Fall back to keyword search or structured product lookup
- If XML parsing fails: Clear error messages in admin dashboard

## Timeline

- **Week 1-2**: Core flow implementation
- **Week 3**: Integration testing, mock data setup
- **Week 4**: Pilot store deployment, feedback collection
- **Post-MVP**: Iterate based on feedback

