'use strict';
/**
 * `learncode` type prompt
 */

const cliCursor = require('cli-cursor');
const chalk = require('chalk');
const Base = require('inquirer/lib/prompts/base');
const observe = require('inquirer/lib/utils/events');
const Paginator = require('inquirer/lib/utils/paginator');


class LearncodePrompt extends Base {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    if (!(this.answers && this.answers.mac) && !this.opt.mac) {
      this.throwParamError('mac');
    }

    this.mac = (this.answers && this.answers.mac) || this.opt.mac;

    if (!this.opt.broadlinkManager) {
      this.throwParamError('broadlinkManager');
    }

    this.paginator = new Paginator(this.screen);
  }

  /**
   * Start the Inquiry session
   * @param  {Function} cb      Callback when prompt is done
   * @return {this}
   */

  _run(cb) {
    this.done = cb;

    // Once user confirm (enter key)
    var events = observe(this.rl);
    var submit = events.line.map(this.getCurrentValue.bind(this));

    var validation = this.handleSubmitEvents(submit);
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));


    const broadlinkManager = this.opt.broadlinkManager;

    broadlinkManager.stopLearning();

    this.codeListener = this.onLearn.bind(this);
    this.stateListener = this.onState.bind(this);

    broadlinkManager.on('code', this.codeListener);
    broadlinkManager.on('state', this.stateListener);

    // Init
    cliCursor.hide();
    this.render();

    return this;
  }

  /**
   * Render the prompt to screen
   * @return {LearncodePrompt} self
   */

  render(error) {
    var bottomContent = '';
    var message = this.getQuestion();
    const broadlinkManager = this.opt.broadlinkManager;
    const mac = this.mac;

    if (this.status === 'answered') {
      message += '\n' + chalk.cyan(this.answer);
    } else {
      if (this.learncode) {
        message += '\n' + chalk.cyan(this.learncode);
      }

      if (broadlinkManager.state === 'learning') {
        bottomContent += chalk.cyan('>> ') + 'Point the remote control toward broadlink(' + mac + ') and press the button.\n';
      } else {
        bottomContent += chalk.red('>> ') + 'Wait for broadlink device:' + mac + ' to enter learning mode.\n';

        broadlinkManager.startLearning(mac, true);
      }
    }

    if (error) {
      bottomContent += chalk.red('>> ') + error;
    }

    this.screen.render(message, bottomContent);
  }

  /**
   * When user press `enter` key
   */
  getCurrentValue() {
    return this.learncode;
  }

  onEnd(state) {
    this.answer = state.value;
    this.status = 'answered';

    const broadlinkManager = this.opt.broadlinkManager;
    broadlinkManager.removeListener('code', this.codeListener);
    broadlinkManager.removeListener('state', this.stateListener);

    // Re-render prompt
    this.render();


    cliCursor.show();
    this.screen.done();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  /**
   * When enter learning mode
   */
  onState(state) {
    this.render();
  }

  /**
   * When learned IR code
   */
  onLearn(code) {
    this.learncode = code;
    this.render();
  }
}

module.exports = LearncodePrompt;