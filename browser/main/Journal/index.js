import PropTypes from 'prop-types'
import React from 'react'
import CSSModules from 'browser/lib/CSSModules'
import styles from './Journal.styl'
import i18n from 'browser/lib/i18n'
import journalProcessor from 'browser/main/lib/journalProcessor'

class Journal extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      tags: '',
      heading: '',
      content: '',
      isProcessing: false
    }
  }

  handleInputChange(e) {
    this.setState({ [e.target.name]: e.target.value })
  }

  async handleSubmit(e) {
    e.preventDefault()
    const { tags, heading, content } = this.state
    const { data, dispatch } = this.props

    if (!tags.trim() || !content.trim()) {
      alert('Tags and Content are required.')
      return
    }

    this.setState({ isProcessing: true })
    try {
      await journalProcessor.processEntry({
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        heading: heading.trim(),
        content: content.trim(),
        data,
        dispatch
      })
      this.setState({
        tags: '',
        heading: '',
        content: '',
        isProcessing: false
      })
      alert(i18n.__('Journal entry processed!'))
    } catch (err) {
      console.error(err)
      alert(i18n.__('Error processing journal entry: ') + err.message)
      this.setState({ isProcessing: false })
    }
  }

  render() {
    return (
      <div className='Journal' styleName='root' style={this.props.style}>
        <div styleName='header'>
          <h1>{i18n.__('Journal')}</h1>
        </div>
        <form styleName='form' onSubmit={this.handleSubmit.bind(this)}>
          <div styleName='field'>
            <label>{i18n.__('Tags (comma separated)')}</label>
            <input
              type='text'
              name='tags'
              value={this.state.tags}
              onChange={this.handleInputChange.bind(this)}
              placeholder='e.g. ProjectA, Work'
            />
          </div>
          <div styleName='field'>
            <label>{i18n.__('Heading / Title')}</label>
            <input
              type='text'
              name='heading'
              value={this.state.heading}
              onChange={this.handleInputChange.bind(this)}
              placeholder='e.g. Progress Update'
            />
          </div>
          <div styleName='field'>
            <label>{i18n.__('Content')}</label>
            <textarea
              name='content'
              value={this.state.content}
              onChange={this.handleInputChange.bind(this)}
              rows='10'
            />
          </div>
          <button type='submit' disabled={this.state.isProcessing}>
            {this.state.isProcessing ? i18n.__('Processing...') : i18n.__('Submit')}
          </button>
        </form>
      </div>
    )
  }
}

Journal.propTypes = {
  data: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  style: PropTypes.object
}

export default CSSModules(Journal, styles)
