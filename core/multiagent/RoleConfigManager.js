import {info} from '../utils/logger.js';

/**
 * RoleConfigManager manages configuration for different agent roles
 */
class RoleConfigManager {
  constructor(baseConfig = {}) {
    this.baseConfig = baseConfig;
    this.roleConfigs = {
      'planner': {
        drives: ['PlanCreation', 'ExecutionSequence'],
        reasoning: {
          strategy: 'AStar' // For planning
        }
      },
      'executor': {
        drives: ['TaskExecution', 'ResourceManagement'],
        ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.3, // Higher threshold for execution
      },
      'critic': {
        drives: ['Evaluation', 'ContradictionDetection'],
        reasoning: {
          strategy: 'ContradictionAnalyzer' // Focus on checking consistency
        }
      },
      'researcher': {
        drives: ['InformationRetrieval', 'KnowledgeAcquisition'],
        LM: {
          LLM_PROVIDER: baseConfig.LM?.LLM_PROVIDER || 'xenova',
          TEXT_GENERATION_MODEL: baseConfig.LM?.TEXT_GENERATION_MODEL || 'Xenova/distilgpt2'
        }
      },
      'default': {}
    };
  }

  /**
   * Get configuration for a specific role
   * @param {string} role - The agent role
   * @returns {Object} - Configuration specific to the role
   */
  getRoleConfig(role) {
    const baseConfig = {
      FOCUS_SET_SIZE: this.baseConfig.FOCUS_SET_SIZE || 20,
      META_TASK_PRIORITY: this.baseConfig.META_TASK_PRIORITY || 0.9,
      ACTIONABLE_GOAL_PRIORITY_THRESHOLD: this.baseConfig.ACTIONABLE_GOAL_PRIORITY_THRESHOLD || 0.1
    };

    const roleSpecificConfig = this.roleConfigs[role] || this.roleConfigs.default;
    
    return {
      ...baseConfig,
      ...roleSpecificConfig
    };
  }

  /**
   * Register a new role configuration
   * @param {string} role - The role name
   * @param {Object} config - The role configuration
   */
  registerRoleConfig(role, config) {
    this.roleConfigs[role] = {
      ...this.roleConfigs.default,
      ...config
    };
    info(`Registered role configuration: ${role}`);
  }

  /**
   * Get all available roles
   * @returns {Array} - Array of role names
   */
  getAvailableRoles() {
    return Object.keys(this.roleConfigs);
  }
}

export default RoleConfigManager;