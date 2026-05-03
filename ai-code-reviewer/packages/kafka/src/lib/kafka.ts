export enum KafkaTopics {
  PR_EVENTS_RAW = 'pr.events.raw',
  PR_EVENTS_MANUAL = 'pr.events.manual',
  PR_EVENTS_MERGED = 'pr.events.merged',
  
  ANALYSIS_TASKS_STATIC = 'analysis.tasks.static',
  ANALYSIS_TASKS_SEMANTIC = 'analysis.tasks.semantic',
  ANALYSIS_TASKS_PREDICTION = 'analysis.tasks.prediction',
  
  ANALYSIS_RESULTS_STATIC = 'analysis.results.static',
  ANALYSIS_RESULTS_SEMANTIC = 'analysis.results.semantic',
  ANALYSIS_RESULTS_PREDICTION = 'analysis.results.prediction',
  
  NOTIFICATION_EVENTS = 'notification.events'
}
