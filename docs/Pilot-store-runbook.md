# Pilot Store Runbook - NoelIQ

## Pre-Launch Checklist

### Infrastructure Setup
- [ ] Azure OpenAI resource created and models deployed
- [ ] Azure AI Search index created and configured
- [ ] Database (PostgreSQL) provisioned and schema applied
- [ ] Environment variables configured in production
- [ ] SSL certificates configured (if using HTTPS)

### Data Preparation
- [ ] Initial product catalogue XML uploaded
- [ ] Full reindex completed successfully
- [ ] Sync status shows all SKUs as "synced"
- [ ] Sample questions tested and verified

### Staff Training
- [ ] Staff briefed on NoelIQ purpose and capabilities
- [ ] Staff trained on how to ask effective questions
- [ ] Staff know when to escalate (safety, warranty edge cases)
- [ ] Staff understand attach suggestions are recommendations, not requirements

### Store Configuration
- [ ] Store ID configured in system
- [ ] Tablets/devices ready with bookmarked NoelIQ URL
- [ ] Network connectivity verified
- [ ] Backup plan communicated (phone support, manual lookup)

## Launch Day

### Morning Checklist
1. **Health Check**
   - Verify backend `/api/health` returns OK
   - Test one question from Ask Panel
   - Check admin dashboard shows green sync status

2. **Staff Briefing** (15 minutes)
   - Quick reminder of how to use NoelIQ
   - Emphasize: "If it says 'Let me check', that's normal - just ask someone or use manual tools"
   - Show example: "Is this TV good for PS5?" → shows answer with attach suggestions

3. **Monitor**
   - Watch logs for errors
   - Check response times
   - Observe staff usage patterns

### During Day

#### If Questions Fail
- Check Azure OpenAI status page
- Check backend logs for errors
- Try admin dashboard health check
- Escalate to technical support if needed

#### If Answers Are Wrong
- Note the question and SKU
- Check if product data is up to date
- Verify embeddings are correct (admin dashboard)
- May need to re-embed product

#### If Slow Responses
- Check Azure OpenAI quota/limits
- Check network latency
- Consider reducing chunk retrieval count
- Monitor concurrent users

### End of Day

1. **Review Logs**
   - Total questions asked
   - Error rate
   - Average response time
   - Common questions

2. **Staff Feedback**
   - Quick debrief with staff
   - What worked? What didn't?
   - Any questions that surprised them?
   - UI/UX issues?

3. **Data Collection**
   - Export usage logs
   - Note any patterns
   - Flag issues for next day

## Daily Operations

### Morning Routine
- Check sync status (all green?)
- Review overnight errors
- Test one question to verify system health

### Weekly Tasks
- Review top questions by category
- Check for products with many "Let me check" responses
- Update catalogue if new products added
- Review attach suggestion effectiveness

### Monthly Tasks
- Full catalogue refresh (if not automated)
- Analytics review: conversion impact, attach rate, staff satisfaction
- System performance review: response times, error rates

## Troubleshooting Guide

### Problem: "Let me check" for everything
**Possible Causes:**
- Vector index empty or corrupted
- Embeddings not generated correctly
- Azure AI Search connection issue

**Actions:**
1. Check admin dashboard sync status
2. Try reindexing one SKU
3. Check Azure AI Search logs

### Problem: Slow responses (>5 seconds)
**Possible Causes:**
- Azure OpenAI rate limiting
- Network latency
- Too many chunks being retrieved

**Actions:**
1. Check Azure OpenAI metrics
2. Reduce chunk retrieval count
3. Add caching for common questions

### Problem: Wrong answers
**Possible Causes:**
- Product data outdated
- Wrong chunks retrieved
- Prompt needs tuning

**Actions:**
1. Verify product data freshness
2. Check which chunks were retrieved (citations)
3. Review prompt template

### Problem: Admin dashboard not loading
**Possible Causes:**
- Database connection issue
- Backend API down
- Authentication token expired

**Actions:**
1. Check backend health endpoint
2. Verify database connectivity
3. Check admin token configuration

## Escalation Contacts

- **Technical Issues**: [Technical Lead Email/Phone]
- **Azure Support**: [Azure Support Contact]
- **Store Operations**: [Store Manager Contact]

## Rollback Plan

If critical issues occur:
1. Direct staff to use existing tools/manual lookup
2. Disable NoelIQ frontend (or show maintenance message)
3. Investigate and fix issues
4. Re-enable after verification

---

**Last Updated**: [Date]
**Next Review**: [Date + 1 month]

