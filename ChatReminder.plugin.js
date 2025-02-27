/**
 * @name ChatReminder
 * @description Right click a message and pick "Set Reminder" to set a reminder. Also looks through dms and auto-reminds users of messages they forgot or haven't responded to.  
 * @version 0.0.1
 * @author Mark123
 * @authorId 249746236008169473
 * @website https://github.com/Mark123M/unghost
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    info: {
        name: "ChatReminder",
        authors: [
            {
                name: "Mark123",
                github_username: "Mark123",
            }
        ],
        version: "0.0.1",
        description: "Right click a message and pick \"Set Reminder\" to set a reminder. Also looks through dms and auto-reminds users of messages they forgot to or haven't responded to.",
        github: "https://github.com/Mark123M/ChatReminder",
    },
    defaultConfig: [
      {
          type: "textbox",
          id: "reminderInterval",
          name: "Auto Reminder-Interval",
          note: "Enter a positive integer to set the time interval (in minutes) between each auto reminder. (Must restart plugin)",
          value: 30
      },
      {
        type: "textbox",
        id: "notificationSoundURL",
        name: "Notification Sound",
        note: "Enter a custom sound file link/URL",
        value: "https://drive.google.com/uc?id=1_qB9XE7-7XRJ6HjokId2-Y_pWj2WgEc7"
      } 
    ],
    changelog: [
      {
          title: "Deployment",
          type: "fixed",
          items: [
          "Auto-Reminder System: Looks through dms and reminds user after a time interval of messages they forgot or haven't responded to.",      
          "Manual-Reminder System: Right click a message and click \"Set Reminder\" to set a reminder that displays the message after a set amount of time."
          ]
        }
    ],
    main: "index.js"
  };


  
  module.exports = !global.ZeresPluginLibrary ?
  class {
    constructor() {
        this._config = config;
        
    }
  
    load() {
        BdApi.showConfirmationModal('Library plugin is needed',
            `The library plugin needed for AQWERT'sPluginBuilder is missing. Please click Download Now to install it.`, {
            confirmText: 'Download',
            cancelText: 'Cancel',
            onConfirm: () => {
                request.get('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                    if (error)
                        return electron.shell.openExternal('https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js');
  
                    fs.writeFileSync(path.join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js'), body);
                });
            }
        });
    }
  
    start() { }
  
    stop() { }
  }
   : (([Plugin, Api]) => {
     const plugin = (Plugin, Api) => {
    const {ContextMenu} = window.BdApi;
    const {DiscordModules, Modals} = Api;
  
    const UserStore = DiscordModules.UserStore;
    const ImageResolver = DiscordModules.ImageResolver;
  
    const MessageStore = DiscordModules.MessageStore;
    const MessageActions = DiscordModules.MessageActions;
    const ChannelStore = DiscordModules.ChannelStore;
    const NavigationUtils = DiscordModules.NavigationUtils
    const MentionStore = DiscordModules.MentionStore
    const ChannelActions = BdApi.Webpack.getModule(m => m.getLastSelectedChannelId && m.getChannelId);
  
    let allGhosted = [];
    let allReminders = [];
    let autoReminderModal = null
    let manualReminderModal = null
 
    let messageBox = null;
    let messageSelector = null
    let messageObserver = null

    let manualReminderInterval = 0


    return class RoleMembers extends Plugin {
  
        onStart() {
            this.patchMessageContextMenu();

            messageBox = document.querySelector('[aria-label^="Messages in"]')
            messageBox?.addEventListener('contextmenu', this.updateMessageSelector);


            allGhosted = BdApi.loadData('ChatReminder', 'ghosted') === undefined ? [] : BdApi.loadData('ChatReminder', 'ghosted');  //load all ghosted messages
            allReminders = BdApi.loadData('ChatReminder', 'reminders') === undefined? [] : BdApi.loadData('ChatReminder', 'reminders'); //load all reminders

            this.showAutoReminderModal(allGhosted) //display auto reminder on startup

            autoReminderModal = setInterval(()=>{

             new Audio(this.settings.notificationSoundURL).play().then((res)=>{
              })
              .catch(function(error) {
             //   console.log(error)
              });

              this.showAutoReminderModal(allGhosted)
  
            }, Number.isInteger(parseInt(this.settings.reminderInterval)) && parseInt(this.settings.reminderInterval) > 0
            ? parseInt(this.settings.reminderInterval)*60000 : 30 * 60000)

            manualReminderModal = setInterval(()=>{ //check every reminder every 30 seconds
                let newAllReminders = []
          
                for(let i = 0; i < allReminders.length; i++){
                    //if the current date is < the reminder date of message i, add message i to new reminders
                    if(Date.now() < Date.parse(allReminders[i][3])){ 
                        newAllReminders.push(allReminders[i])
                    }
                    else {
                        this.showManualReminderModal(allReminders[i][0], allReminders[i][1], allReminders[i][2])
                    }
                }
                allReminders = newAllReminders
                BdApi.saveData('ChatReminder', 'reminders', allReminders)
               // console.log(BdApi.loadData('ChatReminder', 'reminders'))
            }, 10000)
        }

        
        updateMessageSelector(event){ 
            messageSelector = event.target
        }
        updateInputField(event){ 
            manualReminderInterval = event.target.value
          //  console.log(manualReminderInterval)
        }
        

        showAutoReminderModal(list){
            //filter out the dms that the user is currently talking in
            list = list.filter(g => g[3].channel_id !== ChannelActions.getChannelId())
            let autoReminderModalHTML = null;

            if(list.length>0){
                autoReminderModalHTML = BdApi.DOM.parseHTML
                (`<div class = "reminderWrapper">
                        ${list.map(g=> //add id from api as id of element
                            `<div class = "reminderList" id = ${g[3].id} style = "align-items: center;">
                                <div class = "closeButton" style = "color: white; font-size: 22px; margin-left: 98%; margin-bottom: -30px; margin-top: 15px;"> × </div>
                                <div class = "reminderListItem" style = "margin-top: 15px; margin-left: -10px; display: flex; cursor: pointer;">
                                    ${g[1].includes(`class="avatar`)? `${g[1]}` : 
                                    `<div class=\"message-2CShn3 cozyMessage-1DWF9U groupStart-3Mlgv1 wrapper-30-Nkg cozy-VmLDNB zalgo-26OfGz\" role=\"article\" data-list-item-id=\"chat-messages___chat-messages-1057098653963141170\" tabindex=\"-1\" aria-setsize=\"-1\" aria-roledescription=\"Message\" aria-labelledby=\"message-username-1057098653963141170 uid_1 message-content-1057098653963141170 uid_2 message-timestamp-1057098653963141170\"><div class=\"contents-2MsGLg\"><img src=\"${g[2]}\" aria-hidden=\"true\" class=\"avatar-2e8lTP clickable-31pE3P\" alt=\" \"><h3 class=\"header-2jRmjb\" aria-labelledby=\"message-username-1057098653963141170 message-timestamp-1057098653963141170\"><span id=\"message-username-1057098653963141170\" class=\"headerText-2z4IhQ\"><span class=\"username-h_Y3Us desaturateUserColors-1O-G89 clickable-31pE3P\" aria-expanded=\"false\" role=\"button\" tabindex=\"0\">${g[3].author.username}</span></span><span class=\"timestamp-p1Df1m timestampInline-_lS3aK\"><time aria-label=\"Today at 7:52 PM\" id=\"message-timestamp-1057098653963141170\" datetime=\"2022-12-27T00:52:39.048Z\"><i class=\"separator-AebOhG\" aria-hidden=\"true\"> — </i> —— </time></span></h3><div id=\"message-content-1057098653963141170\" class=\"markup-eYLPri messageContent-2t3eCI\">${g[3].content}</div></div><div id=\"message-accessories-1057098653963141170\" class=\"container-2sjPya\">${g[5]}</div></div>` 
                                        /* if the message does not contain a pfp, add it */} 
                                </div> 
                            </div>`)
                        .join("")}
                </div>`)
            }
            else{
                autoReminderModalHTML = BdApi.DOM.parseHTML
                (`<div class = "reminderWrapper">
                    <div style="color: #c3c4c6;"> All Clear. </div>
                </div>`)
            }
            
           
            const HTMLList = autoReminderModalHTML.querySelectorAll('.reminderListItem')
            for(let i = 0; i<list.length; i++){
                HTMLList[i].addEventListener('click', ()=>this.jumpToMessage(list[i][3]))
            }

            const buttonList = autoReminderModalHTML.querySelectorAll('.closeButton')
            for(let i = 0; i<list.length; i++){
                buttonList[i].addEventListener('click', ()=>this.removeAutoreminder(buttonList[i].parentNode, autoReminderModalHTML))
            }

            const autoReminderModalElement = BdApi.React.createElement(BdApi.ReactUtils.wrapElement(autoReminderModalHTML))
            BdApi.UI.alert("Auto-Reminders", autoReminderModalElement)
        } 

        removeAutoreminder(msg, modalHTML){
            allGhosted = allGhosted.filter(g=>g[3].id !== msg.id)
            BdApi.saveData('ChatReminder', 'ghosted', allGhosted) 
            modalHTML.removeChild(msg)

        }

        showNewReminderModal(msg){
            const curChannelId = ChannelActions.getChannelId()
            const messages = MessageStore.getMessages(curChannelId)._array
            const messageId = msg.id.split('-')[3]
            const messageApi = messages.find(m=>m.id === messageId)

            const newReminderModalHTML = BdApi.DOM.parseHTML
            (`<div class = "newReminder">
                ${msg.innerHTML}
                <div style = "margin-top: 20px; display: flex;">
                    <span style = "margin-right: 7px" class="username-h_Y3Us desaturateUserColors-1O-G89SS" aria-expanded="false" role="button" tabindex="0">
                        Remind me in:
                    </span>
                    <input value = ${manualReminderInterval} class = "newReminderInput" style = "width: 100px; font-size: 16px; border-radius: 2px; color: white; background-color: #202225; border:0; outline:0;" type="text" id="name" name="user_name" />
                    <span style = "margin-left: 7px" class="username-h_Y3Us desaturateUserColors-1O-G89" aria-expanded="false" role="button" tabindex="0">
                        minutes
                    </span>
                    
                </div>
                <span style = "color: #b9bbbe; font-size: 13px; margin-left: -1px; " class="timestamp-p1Df1m timestampInline-_lS3aK"><time aria-label="Today at 2:00 AM" id="message-timestamp-1057191193781469214" datetime="2022-12-27T07:00:22.260Z"><i class="separator-AebOhG" aria-hidden="true"> — </i>Enter a non-negative integer</time></span>
            </div>`)
            const inputField = newReminderModalHTML.querySelector('[class="newReminderInput"]')

            //update the interval value if input field changes
            inputField.addEventListener("change", this.updateInputField)

            const newReminderModalElement = BdApi.React.createElement(BdApi.ReactUtils.wrapElement(newReminderModalHTML))
           // console.log(newReminderModalHTML)
            Modals.showModal("Create new reminder", newReminderModalElement, 
            {danger: false, confirmText: 'Okay', cancelText: 'Cancel', 
            onConfirm: ()=>{
                this.createReminder(msg, messageApi, manualReminderInterval)
                inputField.removeEventListener("change", this.updateInputField)
            }})
            
        }


        createReminder(msg, messageApi, interval){
            if(Number.isInteger(parseInt(interval)) && parseInt(interval) > 0){
               // console.log(messageApi, 'message api');
                allReminders.push([msg.innerHTML, messageApi, msg.querySelector(`[id^="message-accessories-"]`).cloneNode(true).innerHTML, new Date(Date.now() + interval * 60000) ])
                BdApi.saveData('ChatReminder', 'reminders', allReminders)
                BdApi.showToast("Reminder Created", {type: "success"}); 
            }
            else {
                BdApi.showToast("Error Creating Reminder", {type: "error"});
            }
            manualReminderInterval = 0;
        }


        showManualReminderModal(msg, messageApi, accessories){

            let manualReminderModalHTML = null;
            if(msg.includes(`class="avatar`)){
                manualReminderModalHTML = 
                BdApi.DOM.parseHTML(`<div class = "reminderListItem" style = "margin-top: 15px; display: flex; cursor: pointer;">${msg}</div>`)
            }
            else {
                manualReminderModalHTML = 
                BdApi.DOM.parseHTML(`<div class = "reminderListItem" style = "margin-top: 15px; display: flex; cursor: pointer;"> <div class=\"message-2CShn3 cozyMessage-1DWF9U groupStart-3Mlgv1 wrapper-30-Nkg cozy-VmLDNB zalgo-26OfGz\" role=\"article\" data-list-item-id=\"chat-messages___chat-messages-1057098653963141170\" tabindex=\"-1\" aria-setsize=\"-1\" aria-roledescription=\"Message\" aria-labelledby=\"message-username-1057098653963141170 uid_1 message-content-1057098653963141170 uid_2 message-timestamp-1057098653963141170\"><div class=\"contents-2MsGLg\"><img src=\"${ImageResolver.getUserAvatarURL(messageApi.author)}\" aria-hidden=\"true\" class=\"avatar-2e8lTP clickable-31pE3P\" alt=\" \"><h3 class=\"header-2jRmjb\" aria-labelledby=\"message-username-1057098653963141170 message-timestamp-1057098653963141170\"><span id=\"message-username-1057098653963141170\" class=\"headerText-2z4IhQ\"><span class=\"username-h_Y3Us desaturateUserColors-1O-G89 clickable-31pE3P\" aria-expanded=\"false\" role=\"button\" tabindex=\"0\">${messageApi.author.username}</span></span><span class=\"timestamp-p1Df1m timestampInline-_lS3aK\"><time aria-label=\"Today at 7:52 PM\" id=\"message-timestamp-1057098653963141170\" datetime=\"2022-12-27T00:52:39.048Z\"><i class=\"separator-AebOhG\" aria-hidden=\"true\"> — </i> —— </time></span></h3><div id=\"message-content-1057098653963141170\" class=\"markup-eYLPri messageContent-2t3eCI\">${messageApi.content}</div></div><div id=\"message-accessories-1057098653963141170\" class=\"container-2sjPya\">${accessories}</div></div></div>`)
            }
            manualReminderModalHTML.addEventListener("click", ()=>this.jumpToMessage(messageApi))
            const manualReminderModalElement = BdApi.React.createElement(BdApi.ReactUtils.wrapElement(manualReminderModalHTML))

               
            new Audio(this.settings.notificationSoundURL).play().then((res)=>{
            })
            .catch(function(error) {
            //    console.log(error)
            });
            BdApi.UI.alert("Manual-Reminders", manualReminderModalElement)
        }


        jumpToMessage(msg){
            const channel = ChannelStore.getChannel(msg.channel_id)
          //  console.log(channel)
            NavigationUtils.transitionTo(`/channels/${channel.guild_id===null? '@me' : channel.guild_id}/${channel.id}`)
            MessageActions.jumpToMessage({channelId: msg.channel_id, messageId: msg.id, flash: true})
        }


        patchMessageContextMenu() {
            this.contextMenuPatch = ContextMenu.patch("message", (retVal, props) => {
                retVal.props.children.push(
                    ContextMenu.buildItem({type: "separator"}),
                    ContextMenu.buildItem({label: "Set Reminder", action: () => {
                        //retrieve the entire message data by getting the closest ancestor of type li
                        const newMessage = messageSelector.closest('li')
                   
                        this.showNewReminderModal(newMessage)
                    }})
                ); 
               // console.log(retVal)
            });
        }


        updateAutoReminders(lastMsg){
            const curChannelId = ChannelActions.getChannelId()
            const currentUserId = UserStore.getCurrentUser().id
            const messages = MessageStore.getMessages(curChannelId)._array
          //  console.log(messages)
            const lastUserId = messages[messages.length-1].author.id

            if(currentUserId !== lastUserId) { //if the current user did not sent the last message
          //      console.log(messages[messages.length-1])
                allGhosted = allGhosted.filter(g => g[0] !== lastUserId)
                allGhosted.push([lastUserId, lastMsg.cloneNode(true).innerHTML, ImageResolver.getUserAvatarURL(messages[messages.length-1].author) , messages[messages.length-1],  `${lastMsg.baseURI}/${lastMsg.id.replace('chat-messages-','')}`, lastMsg.querySelector(`[id^="message-accessories-"]`).cloneNode(true).innerHTML  ] )
                BdApi.saveData('ChatReminder', 'ghosted', allGhosted)
            }
            else {
                allGhosted = allGhosted.filter(g => g[0] !== ChannelStore.getChannel(curChannelId).recipients[0]) 
                BdApi.saveData('ChatReminder', 'ghosted', allGhosted)  
            }
        }


        onSwitch(){

            //reset event listeners and mutation observers 
            messageBox?.removeEventListener('contextmenu', this.updateMessageSelector)
            messageObserver?.disconnect()

            messageBox = document.querySelector('[aria-label^="Messages in"]')
        //    console.log(messageBox, 'new message box')
            messageBox?.addEventListener('contextmenu', this.updateMessageSelector);

            const curChannelId = ChannelActions.getChannelId()
        //    console.log(messageBox.children, 'current channel')

            //if the current channel is a dm and if the last message is a message, update auto reminders
            if(ChannelStore.getChannel(curChannelId).name === ""){
                const lastMsg = messageBox.children[messageBox.children.length - 2]
                if(lastMsg.id.startsWith('chat-messages')){
                    this.updateAutoReminders(lastMsg)
                }
            }

            //when the messageBox dom changes, and a new message is added, update auto reminders
            messageObserver = new MutationObserver((mutations)=>{
                mutations.forEach((mutation)=>{ 
                    if(mutation.addedNodes.length>0 && ChannelStore.getChannel(curChannelId).name === ""){
                        if(mutation.addedNodes[0].id.startsWith('chat-messages')){
                            this.updateAutoReminders(mutation.addedNodes[0])
                        }
                    }
                })
            })
            messageObserver.observe(messageBox, {
                attributes: false, 
                childList: true, 
                subtree: true
            })
            
        }


        onStop() {
            BdApi.saveData('ChatReminder', 'ghosted', allGhosted)
            BdApi.saveData('ChatReminder', 'reminders', allReminders)
            clearInterval(autoReminderModal)
            clearInterval(manualReminderModal)
            this.contextMenuPatch?.();
            messageObserver.disconnect()
        }
        

        getSettingsPanel(){
          return this.buildSettingsPanel().getElement();
        }
  
    };
  };
     return plugin(Plugin, Api);
  })(global.ZeresPluginLibrary.buildPlugin(config));
  /*@end@*/