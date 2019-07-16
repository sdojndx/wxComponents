// page/tailoring/index.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        images:[]
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    },
    getPhoto() {
        var that = this;
        wx.chooseImage({
            count: 9, // 默认9
            success: function (res) {
                var paths = res.tempFilePaths;
                that.setData({
                    cropperPhotoImg: paths,
                    showCropperPhoto: true
                });
            }
        });
    },
    closePhotoImages(){
        this.setData({
            showCropperPhoto: false
        });
    },
    uploadPhotoImages(e) {//上传
        if (!e.detail) {
            return;
        }
        var images = this.data.images.concat(e.detail);
        this.setData({
            images,
            showCropperPhoto: false
        })
    }
})